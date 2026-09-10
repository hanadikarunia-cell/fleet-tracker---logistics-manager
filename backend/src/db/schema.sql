-- Fleet Tracker schema
create extension if not exists pgcrypto;

-- Migrating an already-provisioned DB from an earlier version of this schema that had
-- inventory_movements.item_id FK-enforced: drop it (see the table definition below for why).
alter table if exists inventory_movements drop constraint if exists inventory_movements_item_id_fkey;

create table if not exists gps_devices (
  id text primary key,
  name text not null,
  imei text not null,
  status text not null default 'offline',
  battery_level numeric not null default 100,
  signal_strength text not null default 'good',
  assigned_vehicle_id text,
  last_ping timestamptz not null default now()
);

create table if not exists vehicles (
  id text primary key,
  name text not null,
  type text not null,
  license_plate text not null,
  device_id text references gps_devices(id) on delete set null,
  status text not null default 'offline',
  speed numeric not null default 0,
  last_updated timestamptz not null default now(),
  battery_percent numeric not null default 100,
  fuel_level numeric not null default 100,
  lat double precision not null default 0,
  lng double precision not null default 0,
  bearing numeric not null default 0,
  cargo_weight numeric not null default 0,
  max_cargo_weight numeric not null default 0,
  max_payload_kg numeric,
  driver_name text,
  driver_phone text,
  driver_email text,
  driver_address text,
  avatar text,
  icon_color text,
  odometer numeric,
  engine_hours numeric,
  tire_pressures jsonb,
  fuel_capacity numeric,
  average_fuel_consumption numeric,
  fuel_efficiency_score numeric,
  route_from text,
  route_to text
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gps_devices_assigned_vehicle_fk'
  ) then
    alter table gps_devices
      add constraint gps_devices_assigned_vehicle_fk
      foreign key (assigned_vehicle_id) references vehicles(id) on delete set null;
  end if;
end $$;

create table if not exists geofences (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  radius numeric not null default 0,
  type text not null default 'circle',
  active boolean not null default true,
  vertices jsonb
);

create table if not exists fleet_alerts (
  id uuid primary key default gen_random_uuid(),
  vehicle_id text references vehicles(id) on delete cascade,
  vehicle_name text,
  geofence_name text,
  type text not null,
  timestamp timestamptz not null default now(),
  resolved boolean not null default false,
  severity text not null default 'info',
  details text,
  initial_fuel numeric,
  final_fuel numeric
);

create table if not exists maintenance_logs (
  id text primary key,
  vehicle_id text references vehicles(id) on delete cascade,
  service_type text not null,
  description text,
  mileage_interval numeric,
  status text not null default 'scheduled',
  due_date date,
  cost numeric
);

create table if not exists driver_performance (
  id uuid primary key default gen_random_uuid(),
  vehicle_id text references vehicles(id) on delete cascade,
  vehicle_name text,
  driver_name text not null,
  safety_score numeric default 100,
  max_speed numeric default 0,
  harsh_braking_count integer default 0,
  harsh_acceleration_count integer default 0,
  idle_time_min numeric default 0,
  total_distance_km numeric default 0,
  driver_phone text,
  driver_email text,
  driver_address text,
  avatar text
);

create table if not exists inventory_items (
  id text primary key,
  name text not null,
  sku text unique not null,
  category text not null,
  quantity integer not null default 0,
  location text,
  assigned_vehicle_id text references vehicles(id) on delete set null,
  unit_weight numeric not null default 0,
  min_stock_level numeric
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  -- Not FK-enforced on purpose: movement rows are an append-only audit log that must stay
  -- insertable for not-yet-committed bulk imports, and must outlive a deleted item.
  item_id text,
  sku text,
  item_name text,
  type text not null,
  quantity_delta numeric,
  previous_quantity numeric,
  new_quantity numeric,
  from_location text,
  to_location text,
  performed_by text,
  timestamp timestamptz not null default now(),
  notes text
);

create table if not exists location_history (
  id uuid primary key default gen_random_uuid(),
  vehicle_id text references vehicles(id) on delete cascade,
  device_id text,
  lat double precision not null,
  lng double precision not null,
  speed numeric,
  heading numeric,
  timestamp timestamptz not null default now()
);
create index if not exists location_history_vehicle_ts_idx on location_history (vehicle_id, timestamp desc);

-- app_users is linked 1:1 to Supabase Auth accounts (real login, not a demo persona list).
-- If an earlier version of this schema created it with a plain text id, migrate by dropping
-- and recreating — nothing else has a foreign key into it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'app_users' and column_name = 'id' and data_type <> 'uuid'
  ) then
    drop table app_users cascade;
  end if;
end $$;

create table if not exists app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role text not null default 'viewer' check (role in ('admin', 'manager', 'viewer')),
  avatar text,
  department text,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  message text not null,
  image_url text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

-- Public bucket: the backend (service role) is the only writer, but reads happen directly
-- against Supabase's public object URL — no need to proxy image bytes through our own API.
insert into storage.buckets (id, name, public)
values ('feedback-images', 'feedback-images', true)
on conflict (id) do nothing;

-- Row Level Security: browser reads via Supabase Realtime/anon key are read-only, and only for
-- operational tables — never app_users, which holds real account identities. All writes (and
-- all app_users access) go through the backend service-role key, which bypasses RLS and is
-- gated by the requireAuth/requireRole middleware instead.
alter table vehicles enable row level security;
alter table gps_devices enable row level security;
alter table geofences enable row level security;
alter table fleet_alerts enable row level security;
alter table maintenance_logs enable row level security;
alter table driver_performance enable row level security;
alter table inventory_items enable row level security;
alter table inventory_movements enable row level security;
alter table location_history enable row level security;
alter table app_users enable row level security;
alter table feedback enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'vehicles','gps_devices','geofences','fleet_alerts','maintenance_logs',
    'driver_performance','inventory_items','inventory_movements','location_history'
  ])
  loop
    execute format('drop policy if exists %I on %I;', 'public_read_' || t, t);
    execute format('create policy %I on %I for select using (true);', 'public_read_' || t, t);
  end loop;
end $$;
