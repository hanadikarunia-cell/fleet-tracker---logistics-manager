import { Router } from 'express';
import { requireIdentity } from '../middleware/auth.js';
import { supabase } from '../supabaseClient.js';

export const authRouter = Router();

// Login itself happens client-side via supabase-js (signInWithPassword) against Supabase Auth
// directly — this backend never sees a password. This endpoint just resolves a valid session
// token into the caller's app profile (id/name/role/email), plus the tenant the request is
// actually scoped to: null for a platform-only login that hasn't picked a tenant, and
// different from tenantId only for a platform admin monitoring another tenant.
authRouter.get('/me', requireIdentity, async (req, res) => {
  let activeTenantName: string | null = null;
  if (req.tenantId) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', req.tenantId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    activeTenantName = tenant?.name ?? null;
  }
  res.json({ ...req.user, activeTenantId: req.tenantId ?? null, activeTenantName });
});
