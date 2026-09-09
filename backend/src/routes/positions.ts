import { Router } from 'express';
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

positionsRouter.post('/', async (req, res) => {
  const body = req.body as PositionPayload;
  const { device_id, lat, lng } = body;
  const speed = body.speed ?? 0;
  const heading = body.heading ?? 0;
  const timestamp = body.timestamp ?? new Date().toISOString();

  if (!device_id || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'device_id, lat, and lng are required' });
  }

  const { data: device, error: deviceError } = await supabase
    .from('gps_devices')
    .select('*')
    .eq('id', device_id)
    .maybeSingle();
  if (deviceError) return res.status(500).json({ error: deviceError.message });
  if (!device) {
    return res.status(404).json({ error: `Unknown device_id "${device_id}". Register it via POST /api/devices first.` });
  }
  if (!device.assigned_vehicle_id) {
    return res.status(400).json({ error: `Device "${device_id}" is not assigned to a vehicle.` });
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', device.assigned_vehicle_id)
    .maybeSingle();
  if (vehicleError) return res.status(500).json({ error: vehicleError.message });
  if (!vehicle) return res.status(404).json({ error: `Assigned vehicle "${device.assigned_vehicle_id}" not found.` });

  const previousLat = vehicle.lat;
  const previousLng = vehicle.lng;

  // 1. Record the raw ping.
  await supabase.from('location_history').insert({
    vehicle_id: vehicle.id,
    device_id,
    lat,
    lng,
    speed,
    heading,
    timestamp,
  });

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

  // 4. Geofence enter/exit check against active fences.
  const { data: fences } = await supabase.from('geofences').select('*').eq('active', true);
  const newAlerts: any[] = [];

  for (const fence of (fences ?? []) as GeofenceRow[]) {
    const wasInside = isInsideGeofence(previousLat, previousLng, fence);
    const isInside = isInsideGeofence(lat, lng, fence);
    if (wasInside === isInside) continue;

    const alertType = isInside ? 'enter' : 'exit';
    const { data: alert } = await supabase
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
      })
      .select()
      .single();
    if (alert) newAlerts.push(alert);
  }

  res.status(201).json({ vehicle: mapVehicleRow(updatedVehicle), alerts: newAlerts });
});
