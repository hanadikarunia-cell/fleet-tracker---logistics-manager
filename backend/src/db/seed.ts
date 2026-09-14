// Seeds the one real device/vehicle pair needed for the phone-as-GPS walkthrough
// (Step 5 of the setup): open /track.html on your phone, hit Start Tracking, and it
// reports as device GPS-101 -> vehicle V-101. Safe to re-run (upserts).
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { supabase } from '../supabaseClient.js';

dotenv.config();

async function main() {
  // tenant_id is required (Phase 1). This script only ever seeds the bootstrap tenant
  // created by schema.sql — not a redesign, just the minimum lookup needed so the
  // existing upserts satisfy the NOT NULL constraint.
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', 'tangerang-logistics')
    .single();
  if (tenantError || !tenant) {
    throw tenantError ?? new Error('Bootstrap tenant "tangerang-logistics" not found — has Phase 1 been migrated?');
  }

  // gps_devices and vehicles reference each other (device -> assigned vehicle,
  // vehicle -> its device), so the device row goes in first without the back-reference,
  // then the vehicle, then the device is updated to point at it.
  const { error: deviceInsertError } = await supabase.from('gps_devices').upsert({
    id: 'GPS-101',
    name: "Hanadi's Phone (Browser GPS)",
    imei: 'N/A',
    status: 'offline',
    battery_level: 100,
    signal_strength: 'good',
    tenant_id: tenant.id,
  });
  if (deviceInsertError) throw deviceInsertError;

  const { error: vehicleError } = await supabase.from('vehicles').upsert({
    id: 'V-101',
    name: 'My Phone (V-101)',
    type: 'Sedan',
    license_plate: 'TBD',
    device_id: 'GPS-101',
    status: 'offline',
    speed: 0,
    lat: -6.1783,
    lng: 106.6319,
    bearing: 0,
    cargo_weight: 0,
    max_cargo_weight: 0,
    driver_name: 'Hanadi',
    icon_color: '#3B82F6',
    tenant_id: tenant.id,
  });
  if (vehicleError) throw vehicleError;

  const { error: deviceError } = await supabase
    .from('gps_devices')
    .update({ assigned_vehicle_id: 'V-101' })
    .eq('id', 'GPS-101');
  if (deviceError) throw deviceError;

  // /api/positions now requires a per-device credential (device authentication
  // phase) — without one, this seeded device could never actually post a
  // position. Provision one here so the walkthrough keeps working; this is a
  // fresh random token generated locally, printed once for the developer
  // running this script, never a hardcoded or production secret.
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const { error: credentialError } = await supabase.from('device_credentials').upsert({
    device_id: 'GPS-101',
    tenant_id: tenant.id,
    token_hash: tokenHash,
    created_at: new Date().toISOString(),
    revoked_at: null,
  });
  if (credentialError) throw credentialError;

  console.log('Seeded V-101 / GPS-101 for the phone-as-GPS-device walkthrough.');
  console.log(`Device token for GPS-101 (enter this on /track.html — shown only this once): ${token}`);
  console.log('Run `npm run bootstrap-admin -- <email> <password> <name>` to create the first real login.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
