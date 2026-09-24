import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { toCamel, toCamelList } from '../transform.js';
import { requireAuth, requirePlatformAdmin } from '../middleware/auth.js';

// The one deliberately cross-tenant surface in the whole app — see schema.sql's
// platform_admins comment for why this is gated separately from every other route.
export const platformRouter = Router();
platformRouter.use(requireAuth, requirePlatformAdmin);

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
  res.json(toCamel(data));
});

// --- Platform admins (the app-level operator allowlist) ---
// Being a platform admin is a flag on an EXISTING login (every login needs an app_users row
// in some tenant anyway — requireAuth rejects accounts without one). So "adding" one means
// promoting an existing account by email, not minting a new credential here.

platformRouter.get('/admins', async (_req, res) => {
  const { data: admins, error } = await supabase
    .from('platform_admins')
    .select('user_id, created_at')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  const ids = (admins ?? []).map((a) => a.user_id);
  if (ids.length === 0) return res.json([]);

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
        name: p?.name ?? null,
        email: p?.email ?? null,
        tenantName: p ? tenantName.get(p.tenant_id) ?? null : null,
        createdAt: a.created_at,
      };
    })
  );
});

platformRouter.post('/admins', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!email) return res.status(400).json({ error: 'email is required' });

  const { data: profile, error: profileError } = await supabase
    .from('app_users')
    .select('id, name, email, tenant_id')
    .ilike('email', email.replace(/[\\%_]/g, '\\$&')) // case-insensitive exact match, wildcards escaped
    .maybeSingle();
  if (profileError) return res.status(500).json({ error: profileError.message });
  if (!profile) {
    return res.status(404).json({ error: 'No account with that email. Create the user inside a tenant first, then promote them here.' });
  }

  const { error } = await supabase.from('platform_admins').insert({ user_id: profile.id });
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That account is already a platform admin.' });
    return res.status(400).json({ error: error.message });
  }
  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', profile.tenant_id).maybeSingle();
  res.status(201).json({
    userId: profile.id,
    name: profile.name,
    email: profile.email,
    tenantName: tenant?.name ?? null,
    createdAt: new Date().toISOString(),
  });
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

  const { error } = await supabase.from('platform_admins').delete().eq('user_id', req.params.userId);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});
