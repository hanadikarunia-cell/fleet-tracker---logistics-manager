import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { toCamel, toCamelList, toSnakeRow } from '../transform.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// Generic REST CRUD router over a single Supabase table. Used for the resources whose
// frontend shape maps 1:1 onto snake_case columns via camelCase conversion (everything
// except `vehicles`, which nests lat/lng into `location` and gets its own router).
// Reads require any logged-in role; writes require `writeRoles` (defaults to admin+manager).
export function crudRouter(
  table: string,
  options?: { orderBy?: string; ascending?: boolean; writeRoles?: string[] }
) {
  const router = Router();
  const writeRoles = options?.writeRoles ?? ['admin', 'manager'];

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    let query = supabase.from(table).select('*');
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(toCamelList(data ?? []));
  });

  router.get('/:id', async (req, res) => {
    const { data, error } = await supabase.from(table).select('*').eq('id', req.params.id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(toCamel(data));
  });

  router.post('/', requireRole(writeRoles), async (req, res) => {
    // Never trust a client-supplied tenant_id/tenantId — the authenticated user's own
    // tenant (set by requireAuth) is the only valid source.
    const { tenant_id: _ignoredSnake, tenantId: _ignoredCamel, ...body } = req.body ?? {};
    const row = toSnakeRow(body);
    row.tenant_id = req.tenantId;
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(toCamel(data));
  });

  router.put('/:id', requireRole(writeRoles), async (req, res) => {
    const row = toSnakeRow(req.body);
    const { data, error } = await supabase.from(table).update(row).eq('id', req.params.id).select().maybeSingle();
    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(toCamel(data));
  });

  router.delete('/:id', requireRole(writeRoles), async (req, res) => {
    const { error } = await supabase.from(table).delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.status(204).send();
  });

  return router;
}
