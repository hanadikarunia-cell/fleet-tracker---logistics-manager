import { Router, type Request } from 'express';
import { supabase } from '../supabaseClient.js';
import { toCamel, toCamelList } from '../transform.js';
import { requireIdentity, requirePlatformAdmin } from '../middleware/auth.js';

// The one deliberately cross-tenant surface in the whole app — see schema.sql's
// platform_admins comment for why this is gated separately from every other route.
//
// What platform admins can do here: manage tenants, manage the user ACCOUNTS of any tenant
// (create, change role, reset password — the "we lost the tenant admin" recovery path), and
// manage other platform admins. What they can never do is modify a tenant's fleet data:
// that's read-only monitoring via X-Tenant-Id (see middleware/auth.ts).
export const platformRouter = Router();
platformRouter.use(requireIdentity, requirePlatformAdmin);

const ROLES = ['admin', 'manager', 'viewer'];

// Records a platform action. A failed audit write is logged loudly but doesn't fail the
// action itself — the action has already happened by the time this runs.
async function audit(req: Request, action: string, opts: { tenantId?: string | null; target?: string; details?: Record<string, unknown> } = {}) {
  const { error } = await supabase.from('platform_audit_log').insert({
    actor_id: req.user!.id,
    actor_email: req.user!.email,
    action,
    tenant_id: opts.tenantId ?? null,
    target: opts.target ?? null,
    details: opts.details ?? null,
  });
  if (error) console.error('platform audit log write failed:', error.message);
}

// --- Tenants ---

platformRouter.get('/tenants', async (req, res) => {
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });
  if (tenantsError) return res.status(500).json({ error: tenantsError.message });

  // No per-tenant user count column exists, so it's computed here rather than adding a
  // denormalized counter that could drift — this table is small enough that a second
  // query plus an in-memory tally costs nothing worth optimizing away.
  const { data: users, error: usersError } = await supabase.from('app_users').select('tenant_id');
  if (usersError) return res.status(500).json({ error: usersError.message });

  const counts = new Map<string, number>();
  for (const u of users ?? []) {
    counts.set(u.tenant_id, (counts.get(u.tenant_id) ?? 0) + 1);
  }

  res.json(
    toCamelList(tenants ?? []).map((t: any) => ({ ...t, userCount: counts.get(t.id) ?? 0 }))
  );
});

// Creates a tenant and its first admin login together. Not a single atomic transaction —
// auth.admin.createUser is an external Auth-service call, not a plain SQL statement this
// connection can wrap — so each step compensates for the one before it on failure,
// matching the exact pattern already used for regular user creation in users.ts.
platformRouter.post('/tenants', async (req, res) => {
  const { name, subdomain, adminName, adminEmail, adminPassword } = req.body ?? {};
  if (!name || !subdomain || !adminName || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'name, subdomain, adminName, adminEmail, and adminPassword are required' });
  }
  if (adminPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name, subdomain, plan: 'standard', status: 'active' })
    .select()
    .single();
  if (tenantError) return res.status(400).json({ error: tenantError.message });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });
  if (createError) {
    await supabase.from('tenants').delete().eq('id', tenant.id);
    return res.status(400).json({ error: createError.message });
  }

  const { error: profileError } = await supabase.from('app_users').insert({
    id: created.user.id,
    name: adminName,
    email: adminEmail,
    role: 'admin',
    tenant_id: tenant.id,
  });
  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    await supabase.from('tenants').delete().eq('id', tenant.id);
    return res.status(400).json({ error: profileError.message });
  }

  await audit(req, 'tenant.create', { tenantId: tenant.id, target: name, details: { subdomain, adminEmail } });
  res.status(201).json({ ...toCamel(tenant), userCount: 1 });
});

platformRouter.patch('/tenants/:id', async (req, res) => {
  const { name, status } = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (status !== undefined) patch.status = status;
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const { data, error } = await supabase.from('tenants').update(patch).eq('id', req.params.id).select().maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  await audit(req, 'tenant.update', { tenantId: data.id, target: data.name, details: patch });
  res.json(toCamel(data));
});

// --- A tenant's user accounts (recovery path; never its fleet data) ---

async function tenantExists(id: string) {
  const { data } = await supabase.from('tenants').select('id, name').eq('id', id).maybeSingle();
  return data;
}

platformRouter.get('/tenants/:id/users', async (req, res) => {
  if (!(await tenantExists(req.params.id))) return res.status(404).json({ error: 'Tenant not found' });
  const { data, error } = await supabase
    .from('app_users')
    .select('id, name, email, role, department, created_at')
    .eq('tenant_id', req.params.id)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(toCamelList(data ?? []));
});

platformRouter.post('/tenants/:id/users', async (req, res) => {
  const tenant = await tenantExists(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const { name, email, role, department, password } = req.body ?? {};
  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: 'name, email, role, and password are required' });
  }
  if (!ROLES.includes(role)) return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) return res.status(400).json({ error: createError.message });

  const { data: profile, error: profileError } = await supabase
    .from('app_users')
    .insert({ id: created.user.id, name, email, role, department, tenant_id: tenant.id })
    .select('id, name, email, role, department, created_at')
    .single();
  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return res.status(400).json({ error: profileError.message });
  }

  await audit(req, 'tenant_user.create', { tenantId: tenant.id, target: email, details: { role } });
  res.status(201).json(toCamel(profile));
});

platformRouter.patch('/tenants/:id/users/:userId', async (req, res) => {
  const { name, role } = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (role !== undefined) {
    if (!ROLES.includes(role)) return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
    patch.role = role;
  }
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  // Scoped to the tenant in the URL so a user id from another tenant can't be reached.
  const { data, error } = await supabase
    .from('app_users')
    .update(patch)
    .eq('id', req.params.userId)
    .eq('tenant_id', req.params.id)
    .select('id, name, email, role, department, created_at')
    .maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  await audit(req, 'tenant_user.update', { tenantId: req.params.id, target: data.email, details: patch });
  res.json(toCamel(data));
});

platformRouter.post('/tenants/:id/users/:userId/reset-password', async (req, res) => {
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  // Ownership check BEFORE the auth call — auth.admin.updateUserById has no tenant concept.
  const { data: target, error: lookupError } = await supabase
    .from('app_users')
    .select('id, email')
    .eq('id', req.params.userId)
    .eq('tenant_id', req.params.id)
    .maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (!target) return res.status(404).json({ error: 'Not found' });

  const { error } = await supabase.auth.admin.updateUserById(target.id, { password });
  if (error) return res.status(400).json({ error: error.message });
  await audit(req, 'tenant_user.reset_password', { tenantId: req.params.id, target: target.email });
  res.status(204).end();
});

// Frontend calls this when a platform admin starts monitoring a tenant, so entering a
// tenant leaves a trace. (Not per-request — that would drown the log.)
platformRouter.post('/monitor', async (req, res) => {
  const tenant = await tenantExists(req.body?.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  await audit(req, 'tenant.monitor', { tenantId: tenant.id, target: tenant.name });
  res.status(204).end();
});

// --- Platform admins ---

platformRouter.get('/admins', async (_req, res) => {
  const { data: admins, error } = await supabase
    .from('platform_admins')
    .select('user_id, name, email, created_at')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  const ids = (admins ?? []).map((a) => a.user_id);
  if (ids.length === 0) return res.json([]);

  // Legacy "hybrid" admins have no name/email here — they're a tenant account that also
  // holds the flag, so their identity comes from app_users.
  const { data: profiles, error: profilesError } = await supabase
    .from('app_users')
    .select('id, name, email, tenant_id')
    .in('id', ids);
  if (profilesError) return res.status(500).json({ error: profilesError.message });
  const { data: tenants, error: tenantsError } = await supabase.from('tenants').select('id, name');
  if (tenantsError) return res.status(500).json({ error: tenantsError.message });

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const tenantName = new Map((tenants ?? []).map((t) => [t.id, t.name]));
  res.json(
    (admins ?? []).map((a) => {
      const p = profileById.get(a.user_id);
      return {
        userId: a.user_id,
        name: a.name ?? p?.name ?? null,
        email: a.email ?? p?.email ?? null,
        tenantName: p ? tenantName.get(p.tenant_id) ?? null : null,
        createdAt: a.created_at,
      };
    })
  );
});

// Creates a platform-ONLY login: an auth account plus a platform_admins row carrying its
// name/email, and deliberately no app_users row — so it has no tenant and no fleet role.
platformRouter.post('/admins', async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) return res.status(400).json({ error: createError.message });

  const { data: row, error } = await supabase
    .from('platform_admins')
    .insert({ user_id: created.user.id, name, email })
    .select('user_id, name, email, created_at')
    .single();
  if (error) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return res.status(400).json({ error: error.message });
  }
  await audit(req, 'platform_admin.create', { target: email });
  res.status(201).json({ userId: row.user_id, name: row.name, email: row.email, tenantName: null, createdAt: row.created_at });
});

platformRouter.delete('/admins/:userId', async (req, res) => {
  // Two lockout guards: you can't remove yourself, and the list can never become empty
  // (the only way back in would then be raw SQL).
  if (req.params.userId === req.user!.id) {
    return res.status(400).json({ error: "You can't remove your own platform admin access." });
  }
  const { count, error: countError } = await supabase
    .from('platform_admins')
    .select('user_id', { count: 'exact', head: true });
  if (countError) return res.status(500).json({ error: countError.message });
  if ((count ?? 0) <= 1) return res.status(400).json({ error: 'There must be at least one platform admin.' });

  const { data: target, error: lookupError } = await supabase
    .from('platform_admins')
    .select('user_id, email')
    .eq('user_id', req.params.userId)
    .maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (!target) return res.status(404).json({ error: 'Not found' });

  // A platform-only login has nothing but this flag, so removing the flag deletes the whole
  // login (it would be a useless orphan otherwise). A hybrid admin is a real tenant account:
  // only the flag goes, the account and its tenant role stay.
  const { data: tenantProfile } = await supabase.from('app_users').select('id').eq('id', req.params.userId).maybeSingle();
  if (tenantProfile) {
    const { error } = await supabase.from('platform_admins').delete().eq('user_id', req.params.userId);
    if (error) return res.status(400).json({ error: error.message });
  } else {
    const { error } = await supabase.auth.admin.deleteUser(req.params.userId);
    if (error) return res.status(400).json({ error: error.message });
    await supabase.from('platform_admins').delete().eq('user_id', req.params.userId);
  }
  await audit(req, 'platform_admin.remove', { target: target.email ?? req.params.userId });
  res.status(204).end();
});

// --- Audit log ---

platformRouter.get('/audit', async (_req, res) => {
  const { data, error } = await supabase
    .from('platform_audit_log')
    .select('id, actor_email, action, tenant_id, target, details, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });

  const { data: tenants } = await supabase.from('tenants').select('id, name');
  const tenantName = new Map((tenants ?? []).map((t) => [t.id, t.name]));
  res.json(
    (data ?? []).map((r) => ({
      id: r.id,
      actorEmail: r.actor_email,
      action: r.action,
      tenantName: r.tenant_id ? tenantName.get(r.tenant_id) ?? null : null,
      target: r.target,
      details: r.details,
      createdAt: r.created_at,
    }))
  );
});
