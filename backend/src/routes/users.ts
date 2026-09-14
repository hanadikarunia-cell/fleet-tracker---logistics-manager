import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { toCamel, toCamelList } from '../transform.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const usersRouter = Router();

// Every /api/users operation is admin-only — this is the account-management surface, not
// operational fleet data. Even listing operators requires admin.
usersRouter.use(requireAuth, requireRole(['admin']));

usersRouter.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(toCamelList(data ?? []));
});

usersRouter.post('/', async (req, res) => {
  const { name, email, role, department, password } = req.body as {
    name: string; email: string; role: string; department?: string; password: string;
  };
  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: 'name, email, role, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) return res.status(400).json({ error: createError.message });

  // The new account belongs to the creating admin's own tenant — never client-supplied.
  const { data: profile, error: profileError } = await supabase
    .from('app_users')
    .insert({ id: created.user.id, name, email, role, department, tenant_id: req.tenantId })
    .select()
    .single();
  if (profileError) {
    // Roll back the auth account so we don't leave an orphaned login with no profile.
    await supabase.auth.admin.deleteUser(created.user.id);
    return res.status(400).json({ error: profileError.message });
  }

  res.status(201).json(toCamel(profile));
});

usersRouter.put('/:id', async (req, res) => {
  // name/role/department only — tenant_id is never accepted from the body, and the
  // update itself is scoped to the caller's own tenant so it can't reach another one.
  const { name, role, department } = req.body as { name?: string; role?: string; department?: string };
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (role !== undefined) patch.role = role;
  if (department !== undefined) patch.department = department;

  const { data, error } = await supabase
    .from('app_users')
    .update(patch)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(toCamel(data));
});

usersRouter.delete('/:id', async (req, res) => {
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  // Verify the target belongs to the caller's own tenant BEFORE the destructive
  // auth.admin.deleteUser call — that call has no tenant concept of its own, so the
  // ownership check has to happen here, not as a query filter on it.
  const { data: target, error: lookupError } = await supabase
    .from('app_users')
    .select('id')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (!target) return res.status(404).json({ error: 'Not found' });

  const { error: authError } = await supabase.auth.admin.deleteUser(req.params.id);
  if (authError) return res.status(400).json({ error: authError.message });
  // The app_users row cascade-deletes via its FK to auth.users, but clean up explicitly in
  // case the auth user was already gone.
  await supabase.from('app_users').delete().eq('id', req.params.id).eq('tenant_id', req.tenantId);
  res.status(204).send();
});
