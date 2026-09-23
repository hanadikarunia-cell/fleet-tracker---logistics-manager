import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../supabaseClient.js';

export const authRouter = Router();

// Login itself happens client-side via supabase-js (signInWithPassword) against Supabase Auth
// directly — this backend never sees a password. This endpoint just resolves a valid session
// token into the caller's app profile (id/name/role/email), plus the tenant the request is
// actually scoped to (differs from tenantId only for a platform admin using the switcher).
authRouter.get('/me', requireAuth, async (req, res) => {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', req.tenantId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ...req.user, activeTenantId: req.tenantId, activeTenantName: tenant?.name ?? null });
});
