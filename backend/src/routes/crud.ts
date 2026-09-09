import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { toCamel, toCamelList, toSnakeRow } from '../transform.js';

// Generic REST CRUD router over a single Supabase table. Used for the resources whose
// frontend shape maps 1:1 onto snake_case columns via camelCase conversion (everything
// except `vehicles`, which nests lat/lng into `location` and gets its own router).
export function crudRouter(table: string, options?: { orderBy?: string; ascending?: boolean }) {
  const router = Router();

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

  router.post('/', async (req, res) => {
    const row = toSnakeRow(req.body);
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(toCamel(data));
  });

  router.put('/:id', async (req, res) => {
    const row = toSnakeRow(req.body);
    const { data, error } = await supabase.from(table).update(row).eq('id', req.params.id).select().maybeSingle();
    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(toCamel(data));
  });

  router.delete('/:id', async (req, res) => {
    const { error } = await supabase.from(table).delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.status(204).send();
  });

  return router;
}
