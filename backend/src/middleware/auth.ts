import type { NextFunction, Request, Response } from 'express';
import { supabase } from '../supabaseClient.js';

export interface AuthedUser {
  id: string;
  email: string;
  role: string;
  name: string;
  tenantId: string;
  isPlatformAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
      tenantId?: string;
    }
  }
}

// Verifies the Supabase access token sent by the frontend, then loads the caller's role from
// app_users. Every route except /api/positions (device ingest) and /api/auth/login-adjacent
// endpoints requires this.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired session' });

  const { data: profile, error: profileError } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError) return res.status(500).json({ error: profileError.message });
  if (!profile) return res.status(403).json({ error: 'No app profile for this account' });

  // Platform-admin status is a separate, orthogonal allowlist — see schema.sql for why
  // it's not a role value on app_users. One extra lookup per request; negligible at this
  // app's scale, and keeping it a plain query (not cached) means a revoked platform admin
  // loses access on their very next request, not whenever a cache happens to expire.
  const { data: platformAdmin, error: platformAdminError } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (platformAdminError) return res.status(500).json({ error: platformAdminError.message });

  req.user = {
    id: data.user.id,
    email: data.user.email ?? profile.email,
    role: profile.role,
    name: profile.name,
    tenantId: profile.tenant_id,
    isPlatformAdmin: !!platformAdmin,
  };
  req.tenantId = profile.tenant_id;

  // Tenant switcher (platform admins only): X-Tenant-Id makes every tenant-scoped route
  // operate on that tenant instead of the caller's home one. Every route already reads
  // req.tenantId, so none of them needed to change. For anyone who isn't a platform admin
  // the header is ignored outright — never trusted, never an error — so it can't be used
  // to probe which tenant ids exist.
  const requestedTenant = req.headers['x-tenant-id'];
  if (req.user.isPlatformAdmin && typeof requestedTenant === 'string' && requestedTenant && requestedTenant !== profile.tenant_id) {
    if (!UUID_RE.test(requestedTenant)) return res.status(400).json({ error: 'Invalid X-Tenant-Id' });
    const { data: target, error: targetError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', requestedTenant)
      .maybeSingle();
    if (targetError) return res.status(500).json({ error: targetError.message });
    if (!target) return res.status(400).json({ error: 'Unknown tenant' });
    req.tenantId = target.id;
  }
  next();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

// Cross-tenant access (the platform's own operator portal) — deliberately separate from
// requireRole, which only ever reasons about the caller's own tenant.
export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.user.isPlatformAdmin) return res.status(403).json({ error: 'Requires platform admin access' });
  next();
}
