// Seeds the one real device/vehicle pair needed for the phone-as-GPS walkthrough
// (Step 5 of the setup): open /track.html on your phone, hit Start Tracking, and it
// reports as device GPS-101 -> vehicle V-101. Safe to re-run (upserts).
import dotenv from 'dotenv';
import { supabase } from '../supabaseClient.js';

dotenv.config();

async function main() {
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
  });
  if (vehicleError) throw vehicleError;

  const { error: deviceError } = await supabase
    .from('gps_devices')
    .update({ assigned_vehicle_id: 'V-101' })
    .eq('id', 'GPS-101');
  if (deviceError) throw deviceError;

  const { error: userError } = await supabase.from('app_users').upsert({
    id: 'USR-01',
    name: 'Hanadi',
    email: 'hanadikarunia@gmail.com',
    role: 'administrator',
    department: 'Fleet Operations',
  });
  if (userError) throw userError;

  console.log('Seeded V-101 / GPS-101 for the phone-as-GPS-device walkthrough, and the admin user.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
