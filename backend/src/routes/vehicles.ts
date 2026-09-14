import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { mapVehicleRow, mapVehicleRows, toSnakeRow } from '../transform.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const vehiclesRouter = Router();
const writeRoles = ['admin', 'manager'];

vehiclesRouter.use(requireAuth);

vehiclesRouter.get('/', async (req, res) => {
  const { data, error } = await supabase.from('vehicles').select('*').order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(mapVehicleRows(data ?? []));
});

vehiclesRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(mapVehicleRow(data));
});

vehiclesRouter.get('/:id/history', async (req, res) => {
  const { from, to, limit } = req.query;
  let query = supabase
    .from('location_history')
    .select('*')
    .eq('vehicle_id', req.params.id)
    .order('timestamp', { ascending: true });

  if (typeof from === 'string') query = query.gte('timestamp', from);
  if (typeof to === 'string') query = query.lte('timestamp', to);
  if (typeof limit === 'string') query = query.limit(Number(limit));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(
    (data ?? []).map((row) => ({
      lat: row.lat,
      lng: row.lng,
      speed: row.speed,
      timestamp: row.timestamp,
    }))
  );
});

vehiclesRouter.post('/', requireRole(writeRoles), async (req, res) => {
  // Never trust a client-supplied tenant_id/tenantId — the authenticated user's own
  // tenant (set by requireAuth) is the only valid source.
  const { tenant_id: _ignoredSnake, tenantId: _ignoredCamel, ...body } = req.body ?? {};
  const row = toSnakeRow(body);
  row.tenant_id = req.tenantId;
  const { data, error } = await supabase.from('vehicles').insert(row).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(mapVehicleRow(data));
});

vehiclesRouter.put('/:id', requireRole(writeRoles), async (req, res) => {
  const row = toSnakeRow(req.body);
  const { data, error } = await supabase.from('vehicles').update(row).eq('id', req.params.id).select().maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(mapVehicleRow(data));
});

vehiclesRouter.delete('/:id', requireRole(writeRoles), async (req, res) => {
  const { error } = await supabase.from('vehicles').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});
