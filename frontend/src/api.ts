import type {
  Vehicle, GPSDevice, Geofence, FleetAlert, MaintenanceLog,
  DriverPerformance, InventoryItem, InventoryMovement, LocationHistoryPoint, AppUser, Feedback, FeedbackStatus,
  ChangelogEntry, ChangelogBumpType, Tenant, TenantStatus, PlatformAdmin, TenantUser, PlatformAuditEntry,
} from './types';
import { supabase } from './supabaseClient';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

// Platform-admin tenant switcher: the selected tenant id lives in localStorage and rides
// along on every authenticated request as X-Tenant-Id. The backend honors it only for
// platform admins and ignores it for everyone else, so a stale value is harmless.
const ACTIVE_TENANT_KEY = 'fleet_active_tenant';

export function getActiveTenantOverride(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TENANT_KEY);
  } catch {
    return null;
  }
}

export function setActiveTenantOverride(tenantId: string | null) {
  try {
    if (tenantId) localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
    else localStorage.removeItem(ACTIVE_TENANT_KEY);
  } catch {
    // storage unavailable — the switcher just won't persist
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session?.access_token) return {};
  const headers: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };
  const tenantOverride = getActiveTenantOverride();
  if (tenantOverride) headers['X-Tenant-Id'] = tenantOverride;
  return headers;
}

// Carries the HTTP status alongside the message so callers that need to react
// specifically to e.g. 401 (the tracker page, on a revoked/invalid device
// credential) can do so without string-matching error text. Still an Error, so
// every existing `err instanceof Error ? err.message : ...` call site is unaffected.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function handleResponse<T>(res: Response, path: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `Request to ${path} failed with status ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(await authHeaders()) };
  const res = await fetch(`${API_URL}${path}`, { headers, ...options });
  return handleResponse<T>(res, path);
}

// For multipart/form-data uploads — no Content-Type here, the browser sets it (with boundary)
// when given a FormData body directly.
async function requestForm<T>(path: string, formData: FormData, method = 'POST'): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method, headers: await authHeaders(), body: formData });
  return handleResponse<T>(res, path);
}

// Device-authenticated requests (e.g. position ingest) carry no user session — the
// tracker page never signs in — so this deliberately does not go through
// authHeaders(); it sends the device's own bearer token instead, when supplied.
async function postDevice<T>(path: string, body: unknown, deviceToken?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (deviceToken) headers.Authorization = `Bearer ${deviceToken}`;
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return handleResponse<T>(res, path);
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const del = (path: string) => request<void>(path, { method: 'DELETE' });

export const api = {
  vehicles: {
    list: () => get<Vehicle[]>('/api/vehicles'),
    create: (v: Omit<Vehicle, 'id'> & { id?: string }) => post<Vehicle>('/api/vehicles', v),
    update: (id: string, v: Partial<Vehicle>) => put<Vehicle>(`/api/vehicles/${id}`, v),
    remove: (id: string) => del(`/api/vehicles/${id}`),
    history: (id: string) => get<LocationHistoryPoint[]>(`/api/vehicles/${id}/history`),
  },
  devices: {
    list: () => get<GPSDevice[]>('/api/devices'),
    // The token is returned once, at registration — never again afterward.
    create: (d: GPSDevice) => post<GPSDevice & { token: string }>('/api/devices', d),
    update: (id: string, d: Partial<GPSDevice>) => put<GPSDevice>(`/api/devices/${id}`, d),
    remove: (id: string) => del(`/api/devices/${id}`),
    rotateToken: (id: string) => post<{ token: string }>(`/api/devices/${id}/rotate-token`, {}),
    revokeToken: (id: string) => post<void>(`/api/devices/${id}/revoke-token`, {}),
    // Pairing-code generation is admin-authenticated (goes through the normal
    // session-bearing `post`); consuming the code to pair is unauthenticated — the
    // phone has no session yet, so it goes through `postDevice` with no token.
    generatePairingCode: (id: string) =>
      post<{ code: string; expiresAt: string; deviceId: string }>(`/api/devices/${id}/pairing-code`, {}),
    pair: (id: string, code: string) => postDevice<{ token: string }>(`/api/devices/${id}/pair`, { code }),
  },
  geofences: {
    list: () => get<Geofence[]>('/api/geofences'),
    create: (g: Geofence) => post<Geofence>('/api/geofences', g),
    update: (id: string, g: Partial<Geofence>) => put<Geofence>(`/api/geofences/${id}`, g),
    remove: (id: string) => del(`/api/geofences/${id}`),
  },
  alerts: {
    list: () => get<FleetAlert[]>('/api/alerts'),
    create: (a: Partial<FleetAlert>) => post<FleetAlert>('/api/alerts', a),
    update: (id: string, a: Partial<FleetAlert>) => put<FleetAlert>(`/api/alerts/${id}`, a),
    remove: (id: string) => del(`/api/alerts/${id}`),
  },
  maintenance: {
    list: () => get<MaintenanceLog[]>('/api/maintenance'),
    create: (m: MaintenanceLog) => post<MaintenanceLog>('/api/maintenance', m),
    update: (id: string, m: Partial<MaintenanceLog>) => put<MaintenanceLog>(`/api/maintenance/${id}`, m),
    remove: (id: string) => del(`/api/maintenance/${id}`),
  },
  driverPerformance: {
    list: () => get<DriverPerformance[]>('/api/driver-performance'),
    create: (d: Partial<DriverPerformance>) => post<DriverPerformance>('/api/driver-performance', d),
    update: (id: string, d: Partial<DriverPerformance>) => put<DriverPerformance>(`/api/driver-performance/${id}`, d),
    remove: (id: string) => del(`/api/driver-performance/${id}`),
  },
  inventory: {
    list: () => get<InventoryItem[]>('/api/inventory'),
    create: (i: Omit<InventoryItem, 'id'> & { id?: string }) => post<InventoryItem>('/api/inventory', i),
    update: (id: string, i: Partial<InventoryItem>) => put<InventoryItem>(`/api/inventory/${id}`, i),
    remove: (id: string) => del(`/api/inventory/${id}`),
  },
  inventoryMovements: {
    list: () => get<InventoryMovement[]>('/api/inventory-movements'),
    create: (m: Omit<InventoryMovement, 'id' | 'timestamp'>) => post<InventoryMovement>('/api/inventory-movements', m),
  },
  users: {
    list: () => get<AppUser[]>('/api/users'),
    create: (u: { name: string; email: string; role: string; department?: string; password: string }) =>
      post<AppUser>('/api/users', u),
    update: (id: string, u: Partial<AppUser>) => put<AppUser>(`/api/users/${id}`, u),
    remove: (id: string) => del(`/api/users/${id}`),
  },
  auth: {
    me: () => get<AppUser>('/api/auth/me'),
  },
  feedback: {
    list: () => get<Feedback[]>('/api/feedback'),
    submit: (message: string, image?: File) => {
      const form = new FormData();
      form.append('message', message);
      if (image) form.append('image', image);
      return requestForm<Feedback>('/api/feedback', form);
    },
    updateStatus: (id: string, status: FeedbackStatus) => put<Feedback>(`/api/feedback/${id}`, { status }),
    remove: (id: string) => del(`/api/feedback/${id}`),
  },
  changelog: {
    list: () => get<ChangelogEntry[]>('/api/changelog'),
    create: (c: { bumpType: ChangelogBumpType; title: string; changes: string[] }) =>
      post<ChangelogEntry>('/api/changelog', c),
    update: (id: string, c: { title?: string; changes?: string[] }) => put<ChangelogEntry>(`/api/changelog/${id}`, c),
    remove: (id: string) => del(`/api/changelog/${id}`),
  },
  platform: {
    tenants: {
      list: () => get<Tenant[]>('/api/platform/tenants'),
      create: (t: { name: string; subdomain: string; adminName: string; adminEmail: string; adminPassword: string }) =>
        post<Tenant>('/api/platform/tenants', t),
      update: (id: string, t: { name?: string; status?: TenantStatus }) =>
        request<Tenant>(`/api/platform/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(t) }),
    },
    // Account management for a tenant's users (recovery path) — never its fleet data.
    tenantUsers: {
      list: (tenantId: string) => get<TenantUser[]>(`/api/platform/tenants/${tenantId}/users`),
      create: (tenantId: string, u: { name: string; email: string; role: string; password: string }) =>
        post<TenantUser>(`/api/platform/tenants/${tenantId}/users`, u),
      update: (tenantId: string, userId: string, u: { name?: string; role?: string }) =>
        request<TenantUser>(`/api/platform/tenants/${tenantId}/users/${userId}`, { method: 'PATCH', body: JSON.stringify(u) }),
      resetPassword: (tenantId: string, userId: string, password: string) =>
        post<void>(`/api/platform/tenants/${tenantId}/users/${userId}/reset-password`, { password }),
    },
    // Records that this platform admin started monitoring a tenant.
    monitor: (tenantId: string) => post<void>('/api/platform/monitor', { tenantId }),
    admins: {
      list: () => get<PlatformAdmin[]>('/api/platform/admins'),
      // Creates a platform-only login (no tenant).
      add: (a: { name: string; email: string; password: string }) => post<PlatformAdmin>('/api/platform/admins', a),
      remove: (userId: string) => del(`/api/platform/admins/${userId}`),
    },
    audit: {
      list: () => get<PlatformAuditEntry[]>('/api/platform/audit'),
    },
  },
  positions: {
    report: (
      p: { device_id: string; lat: number; lng: number; speed?: number; heading?: number; timestamp?: string },
      deviceToken?: string
    ) => postDevice<{ vehicle: Vehicle; alerts: FleetAlert[] }>('/api/positions', p, deviceToken),
  },
};
