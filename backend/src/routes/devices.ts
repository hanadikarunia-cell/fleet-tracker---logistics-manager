import { Router } from 'express';
import crypto from 'node:crypto';
import { supabase } from '../supabaseClient.js';
import { toCamel, toCamelList, toSnakeRow } from '../transform.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// gps_devices used to be served by the generic crud.ts factory. It moved to its own
// router only because POST needs custom logic (issuing a device credential) that the
// factory can't express — GET/PUT/DELETE below are unchanged in shape and semantics
// from what the factory already provided (tenant-scoped, admin-only writes).
export const devicesRouter = Router();
const writeRoles = ['admin'];

devicesRouter.use(requireAuth);

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

devicesRouter.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('gps_devices')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .order('last_ping', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(toCamelList(data ?? []));
});

devicesRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('gps_devices')
    .select('*')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(toCamel(data));
});

// Registration: creates the device row and its first credential atomically (see
// create_device_with_credential in schema.sql — a real multi-table Postgres
// transaction, not simulated with sequential requests). The plaintext token is
// returned exactly once, here, and never again through any GET response.
devicesRouter.post('/', requireRole(writeRoles), async (req, res) => {
  const { tenant_id: _ignoredSnake, tenantId: _ignoredCamel, ...body } = req.body ?? {};
  const row = toSnakeRow(body);
  const id = row.id as string | undefined;
  const name = row.name as string | undefined;
  const imei = row.imei as string | undefined;
  if (!id || !name || !imei) {
    return res.status(400).json({ error: 'id, name, and imei are required' });
  }
  const assignedVehicleId = (row.assigned_vehicle_id as string | undefined) ?? null;

  const token = generateToken();
  const tokenHash = hashToken(token);

  const { data, error } = await supabase.rpc('create_device_with_credential', {
    p_id: id,
    p_name: name,
    p_imei: imei,
    p_assigned_vehicle_id: assignedVehicleId,
    p_tenant_id: req.tenantId,
    p_token_hash: tokenHash,
  });
  if (error) return res.status(400).json({ error: error.message });
  const created = Array.isArray(data) ? data[0] : data;
  if (!created) return res.status(400).json({ error: 'Device registration failed' });

  // token is returned once, alongside the device — never persisted in plaintext,
  // never logged, never part of any other response.
  res.status(201).json({ ...toCamel(created), token });
});

devicesRouter.put('/:id', requireRole(writeRoles), async (req, res) => {
  const { tenant_id: _ignoredSnake, tenantId: _ignoredCamel, ...body } = req.body ?? {};
  const row = toSnakeRow(body);
  const { data, error } = await supabase
    .from('gps_devices')
    .update(row)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(toCamel(data));
});

devicesRouter.delete('/:id', requireRole(writeRoles), async (req, res) => {
  // device_credentials.device_id -> gps_devices.id is ON DELETE CASCADE, so the
  // credential (if any) is removed automatically by the database — no orphan risk.
  const { data, error } = await supabase
    .from('gps_devices')
    .delete()
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

// Rotation: verify tenant ownership first (read), then a single atomic
// INSERT ... ON CONFLICT DO UPDATE (upsert) — this also transparently provisions a
// credential for a device that predates this feature (e.g. the seeded device),
// which has no row in device_credentials yet. The new plaintext token is only
// returned after the upsert has resolved successfully (i.e. after commit).
devicesRouter.post('/:id/rotate-token', requireRole(writeRoles), async (req, res) => {
  const { data: device, error: deviceError } = await supabase
    .from('gps_devices')
    .select('id')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .maybeSingle();
  if (deviceError) return res.status(500).json({ error: deviceError.message });
  if (!device) return res.status(404).json({ error: 'Not found' });

  const token = generateToken();
  const tokenHash = hashToken(token);
  const { error } = await supabase.from('device_credentials').upsert(
    {
      device_id: req.params.id,
      tenant_id: req.tenantId,
      token_hash: tokenHash,
      created_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: 'device_id' }
  );
  if (error) return res.status(400).json({ error: error.message });
  res.json({ token });
});

// Pairing code generation: an admin-facing, one-time-reveal secret distinct from the
// device token itself — its only power is authorizing one credential rotation via
// POST /api/devices/:id/pair (pairing.ts, unauthenticated). Short-lived (10 minutes)
// and single-use (enforced atomically in consume_pairing_code, not here).
const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;
const PAIRING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L — avoids transcription errors

function generatePairingCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += PAIRING_CODE_ALPHABET[crypto.randomInt(PAIRING_CODE_ALPHABET.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

devicesRouter.post('/:id/pairing-code', requireRole(writeRoles), async (req, res) => {
  const { data: device, error: deviceError } = await supabase
    .from('gps_devices')
    .select('id')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .maybeSingle();
  if (deviceError) return res.status(500).json({ error: deviceError.message });
  if (!device) return res.status(404).json({ error: 'Not found' });

  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString();
  const { error } = await supabase.from('device_pairing_codes').insert({
    device_id: req.params.id,
    tenant_id: req.tenantId,
    code_hash: hashToken(code),
    expires_at: expiresAt,
  });
  if (error) return res.status(400).json({ error: error.message });

  // Plaintext code returned once — this is NOT the device token; it only ever
  // authorizes a single pairing exchange, never authenticates a position directly.
  res.status(201).json({ code, expiresAt, deviceId: req.params.id });
});

devicesRouter.post('/:id/revoke-token', requireRole(writeRoles), async (req, res) => {
  const { data, error } = await supabase
    .from('device_credentials')
    .update({ revoked_at: new Date().toISOString() })
    .eq('device_id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select('device_id')
    .maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});
