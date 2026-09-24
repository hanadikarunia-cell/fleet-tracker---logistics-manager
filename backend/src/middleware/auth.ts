import type { NextFunction, Request, Response } from 'express';
import { supabase } from '../supabaseClient.js';

export interface AuthedUser {
  id: string;
  email: string;
  // Effective role for this request. For a platform admin looking into a tenant (see
  // below) it is forced to 'viewer' regardless of any role they hold at home.
  role: string;
  name: string;
  // The account's own tenant. null for a platform-only login, which has none.
  tenantId: string | null;
  isPlatformAdmin: boolean;
  // A platform admin with no tenant profile at all (no app_users row).
  isPlatformOnly: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
      // The tenant this request operates on. Undefined only on identity-only routes for a
      // platform-only login that hasn't picked a tenant.
      tenantId?: string;
    }
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Verifies the Supabase access token sent by the frontend, then resolves who the caller is:
//  - a normal tenant user (app_users row), optionally also on the platform_admins allowlist;
//  - or a platform-only admin (platform_admins row, no app_users row, no tenant).
//
// Tenant monitoring: a platform admin may send X-Tenant-Id to look at another tenant. For
// them (and only them — the header is ignored for everyone else) every tenant-scoped route
// then operates on that tenant, but READ-ONLY: the effective role is forced to 'viewer' and
// any non-GET request is refused. Platform admins manage tenants and their user accounts
// through /api/platform; they never modify a tenant's fleet data.
async function authenticate(req: Request, res: Response, next: NextFunction, tenantRequired: boolean) {
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

  // Platform-admin status is a separate, orthogonal allowlist — see schema.sql for why
  // it's not a role value on app_users. One extra lookup per request; negligible at this
  // app's scale, and keeping it a plain query (not cached) means a revoked platform admin
  // loses access on their very next request, not whenever a cache happens to expire.
  const { data: platformAdmin, error: platformAdminError } = await supabase
    .from('platform_admins')
    .select('user_id, name, email')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (platformAdminError) return res.status(500).json({ error: platformAdminError.message });

  if (!profile && !platformAdmin) return res.status(403).json({ error: 'No app profile for this account' });

  const isPlatformAdmin = !!platformAdmin;
  const isPlatformOnly = !profile;
  const homeTenantId: string | null = profile?.tenant_id ?? null;

  let tenantId: string | null = homeTenantId;
  let lookingElsewhere = false;

  const requestedTenant = req.headers['x-tenant-id'];
  if (isPlatformAdmin && typeof requestedTenant === 'string' && requestedTenant && requestedTenant !== homeTenantId) {
    if (!UUID_RE.test(requestedTenant)) return res.status(400).json({ error: 'Invalid X-Tenant-Id' });
    const { data: target, error: targetError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', requestedTenant)
      .maybeSingle();
    if (targetError) return res.status(500).json({ error: targetError.message });
    if (!target) return res.status(400).json({ error: 'Unknown tenant' });
    tenantId = target.id;
    lookingElsewhere = true;
  }

  const readOnly = isPlatformOnly || lookingElsewhere;
  if (tenantRequired) {
    if (!tenantId) return res.status(403).json({ error: 'Select a tenant to monitor first' });
    if (readOnly && !READ_METHODS.has(req.method)) {
      return res.status(403).json({ error: 'Platform admins have read-only access to tenant data' });
    }
  }

  const email = data.user.email ?? profile?.email ?? platformAdmin?.email ?? '';
  req.user = {
    id: data.user.id,
    email,
    role: readOnly ? 'viewer' : profile.role,
    name: profile?.name ?? platformAdmin?.name ?? email,
    tenantId: homeTenantId,
    isPlatformAdmin,
    isPlatformOnly,
  };
  req.tenantId = tenantId ?? undefined;
  next();
}

// For every tenant-scoped route: guarantees req.tenantId is set (and, for platform admins
// looking into a tenant, that the request is read-only).
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  return authenticate(req, res, next, true);
}

// Identity only — used where no tenant is needed (the platform router, /me, the global
// changelog). Callers must not treat req.tenantId as guaranteed here.
export function requireIdentity(req: Request, res: Response, next: NextFunction) {
  return authenticate(req, res, next, false);
}

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
