import { Router } from 'express';
import crypto from 'node:crypto';
import { supabase } from '../supabaseClient.js';
import { isInsideGeofence, type GeofenceRow } from '../geofence.js';
import { mapVehicleRow } from '../transform.js';

export const positionsRouter = Router();

interface PositionPayload {
  device_id: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

positionsRouter.post('/', async (req, res) => {
  const body = req.body as PositionPayload;
  const { device_id, lat, lng } = body;
  const speed = body.speed ?? 0;
  const heading = body.heading ?? 0;
  const timestamp = body.timestamp ?? new Date().toISOString();

  if (!device_id || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'device_id, lat, and lng are required' });
  }

  // Device authentication. device_id alone is not a credential — it's a
  // non-secret, human-readable label already visible to any logged-in user of
  // its own tenant (via GET /api/devices, GET /api/vehicles, the dashboard UI,
  // and this very tracker page). The device must additionally present the
  // per-device bearer token issued at registration/rotation. No user session
  // exists on this route (a device posts directly, not through requireAuth),
  // so this is a wholly separate trust mechanism from the app's user JWT auth.
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed device credential' });
  }

  // validate_device_credential does the entire authentication decision — token
  // match, not revoked, belongs to this exact device_id, tenant consistent
  // across both tables — as one atomic statement, and advances last_used_at in
  // the same statement (see schema.sql for why that matters under concurrency).
  const { data: credRows, error: credError } = await supabase.rpc('validate_device_credential', {
    p_device_id: device_id,
    p_token_hash: hashToken(token),
  });
  if (credError) return res.status(500).json({ error: credError.message });
  const cred = (Array.isArray(credRows) ? credRows[0] : credRows) as
    | { assigned_vehicle_id: string | null; tenant_id: string }
    | undefined;
  if (!cred) {
    // Deliberately generic — covers unknown device_id, wrong token, revoked
    // credential, device/token mismatch, and a tenant inconsistency between
    // gps_devices and device_credentials alike. Never reveals which, so this
    // can't be used as a device-existence oracle.
    return res.status(401).json({ error: 'Invalid device credentials' });
  }
  const tenantId = cred.tenant_id;
  const assignedVehicleId = cred.assigned_vehicle_id;

  if (!assignedVehicleId) {
    return res.status(400).json({ error: `Device "${device_id}" is not assigned to a vehicle.` });
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', assignedVehicleId)
    .maybeSingle();
  if (vehicleError) return res.status(500).json({ error: vehicleError.message });
  if (!vehicle) return res.status(404).json({ error: `Assigned vehicle "${assignedVehicleId}" not found.` });

  const previousLat = vehicle.lat;
  const previousLng = vehicle.lng;

  // 1. Record the raw ping. tenant comes from the already-authenticated
  // credential above — not from the request body, which is untrusted.
  const { error: historyError } = await supabase.from('location_history').insert({
    vehicle_id: vehicle.id,
    device_id,
    lat,
    lng,
    speed,
    heading,
    timestamp,
    tenant_id: tenantId,
  });
  if (historyError) {
    console.error(`Failed to record location_history for device "${device_id}":`, historyError.message);
  }

  // 2. Update the vehicle's live position.
  const nextStatus = vehicle.status === 'maintenance' ? 'maintenance' : speed > 1 ? 'active' : 'idle';
  const { data: updatedVehicle, error: updateError } = await supabase
    .from('vehicles')
    .update({ lat, lng, speed, bearing: heading, last_updated: timestamp, status: nextStatus })
    .eq('id', vehicle.id)
    .select()
    .single();
  if (updateError) return res.status(500).json({ error: updateError.message });

  // 3. Keep the device fresh.
  await supabase.from('gps_devices').update({ last_ping: timestamp, status: 'online' }).eq('id', device_id);

  // 4. Geofence enter/exit check against this device's own tenant's active fences
  // only — otherwise a transition could be evaluated against (and leak the name
  // of) another tenant's geofence.
  const { data: fences } = await supabase
    .from('geofences')
    .select('*')
    .eq('active', true)
    .eq('tenant_id', tenantId);
  const newAlerts: any[] = [];

  for (const fence of (fences ?? []) as GeofenceRow[]) {
    const wasInside = isInsideGeofence(previousLat, previousLng, fence);
    const isInside = isInsideGeofence(lat, lng, fence);
    if (wasInside === isInside) continue;

    const alertType = isInside ? 'enter' : 'exit';
    const { data: alert, error: alertError } = await supabase
      .from('fleet_alerts')
      .insert({
        vehicle_id: vehicle.id,
        vehicle_name: vehicle.name,
        geofence_name: fence.name,
        type: alertType,
        timestamp,
        resolved: false,
        severity: 'info',
        details: `${vehicle.name} ${alertType === 'enter' ? 'entered' : 'exited'} geofence "${fence.name}".`,
        tenant_id: tenantId,
      })
      .select()
      .single();
    if (alertError) {
      console.error(`Failed to record geofence alert for vehicle "${vehicle.id}":`, alertError.message);
    }
    if (alert) newAlerts.push(alert);
  }

  res.status(201).json({ vehicle: mapVehicleRow(updatedVehicle), alerts: newAlerts });
});
