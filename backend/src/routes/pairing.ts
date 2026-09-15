import { Router } from 'express';
import crypto from 'node:crypto';
import { supabase } from '../supabaseClient.js';
import { isRateLimited } from '../rateLimit.js';

// Public — no user session exists on a phone that hasn't paired yet, same trust
// boundary as positions.ts. Mounted in index.ts BEFORE devicesRouter (which applies
// requireAuth to everything under /api/devices) so this one path resolves first;
// every other /api/devices/* path still falls through to the authenticated router.
export const pairingRouter = Router();

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

pairingRouter.post('/:id/pair', async (req, res) => {
  const deviceId = req.params.id;
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

  // Rate-limit by both the caller's IP and the targeted device_id — blunts a
  // single attacker hammering one device from one IP, and (independently) many
  // attempts against one device spread across IPs. Checked before touching the
  // database at all.
  if (isRateLimited(`ip:${req.ip}`, MAX_ATTEMPTS, WINDOW_MS) || isRateLimited(`device:${deviceId}`, MAX_ATTEMPTS, WINDOW_MS)) {
    return res.status(429).json({ error: 'Too many pairing attempts. Try again later.' });
  }

  if (!deviceId || !code) {
    return res.status(400).json({ error: 'device id and pairing code are required' });
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data, error } = await supabase.rpc('consume_pairing_code', {
    p_device_id: deviceId,
    p_code_hash: hashCode(code),
    p_new_token_hash: tokenHash,
  });
  if (error) return res.status(500).json({ error: error.message });
  const consumed = (Array.isArray(data) ? data[0] : data) as { paired_device_id: string } | undefined;
  if (!consumed) {
    // Deliberately generic — covers unknown device, wrong code, expired,
    // already-used, and a tenant inconsistency alike. Never reveals which.
    return res.status(401).json({ error: 'Invalid or expired pairing code' });
  }

  // The plaintext token is returned exactly once, here, to the pairing browser —
  // never logged, never persisted, never shown in any admin UI for this flow.
  res.status(200).json({ token });
});
