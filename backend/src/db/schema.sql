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

-- App version history ("What's New"). Each row is one release: `version` is the resulting
-- semver string, `bump_type` records whether it was a major/minor/patch step from the previous
-- row, and `changes` holds the bullet list shown to users. The row with the latest created_at
-- is the current app version.
create table if not exists changelog (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  bump_type text not null check (bump_type in ('major', 'minor', 'patch')),
  title text not null,
  changes text[] not null default '{}',
  created_by text,
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
alter table changelog enable row level security;

-- =========================================================================
-- PHASE 1 — MULTI-TENANCY: tenants table, tenant_id backfill, tenant-aware RLS
-- =========================================================================
-- Everything below is additive and safe to run against the existing production
-- database: new table, nullable-then-required columns backfilled to a single
-- bootstrap tenant, then RLS policies swapped from "anyone can read everything"
-- to "only rows belonging to the caller's own tenant". No existing row is
-- deleted, no existing primary key is touched.

-- ---------------------------------------------------------------------------
-- Step 1: tenants table
-- ---------------------------------------------------------------------------
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique
    check (subdomain ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  custom_domain text unique,
  plan text not null default 'standard',
  status text not null default 'active'
    check (status in ('active', 'suspended', 'trial')),
  logo text,
  primary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Step 2: bootstrap tenant — the existing production data becomes this tenant.
-- ---------------------------------------------------------------------------
insert into tenants (name, subdomain, plan, status)
values ('Tangerang Logistics', 'tangerang-logistics', 'standard', 'active')
on conflict (subdomain) do nothing;

-- ---------------------------------------------------------------------------
-- Step 3: nullable tenant_id columns. Nullable first so this ALTER can never
-- fail against rows that don't have a tenant yet — Step 4 backfills them,
-- Step 6 (below) then locks the column down once every row is populated.
-- changelog is intentionally excluded: it's platform-wide release notes,
-- not tenant-owned data.
-- ---------------------------------------------------------------------------
alter table gps_devices         add column if not exists tenant_id uuid;
alter table vehicles            add column if not exists tenant_id uuid;
alter table geofences           add column if not exists tenant_id uuid;
alter table fleet_alerts        add column if not exists tenant_id uuid;
alter table maintenance_logs    add column if not exists tenant_id uuid;
alter table driver_performance  add column if not exists tenant_id uuid;
alter table inventory_items     add column if not exists tenant_id uuid;
alter table inventory_movements add column if not exists tenant_id uuid;
alter table location_history    add column if not exists tenant_id uuid;
alter table app_users           add column if not exists tenant_id uuid;
alter table feedback            add column if not exists tenant_id uuid;

-- ---------------------------------------------------------------------------
-- Step 4: backfill every existing row (across every tenant-owned table) to
-- the bootstrap tenant. Guarded by `where tenant_id is null` so this block
-- is safe to run again later without re-touching already-assigned rows.
-- ---------------------------------------------------------------------------
do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants where subdomain = 'tangerang-logistics';
  if v_tenant_id is null then
    raise exception 'Bootstrap tenant "tangerang-logistics" not found — Step 2 must run first';
  end if;

  update gps_devices        set tenant_id = v_tenant_id where tenant_id is null;
  update vehicles            set tenant_id = v_tenant_id where tenant_id is null;
  update geofences            set tenant_id = v_tenant_id where tenant_id is null;
  update fleet_alerts         set tenant_id = v_tenant_id where tenant_id is null;
  update maintenance_logs     set tenant_id = v_tenant_id where tenant_id is null;
  update driver_performance   set tenant_id = v_tenant_id where tenant_id is null;
  update inventory_items      set tenant_id = v_tenant_id where tenant_id is null;
  update inventory_movements  set tenant_id = v_tenant_id where tenant_id is null;
  update location_history     set tenant_id = v_tenant_id where tenant_id is null;
  update app_users            set tenant_id = v_tenant_id where tenant_id is null;
  update feedback              set tenant_id = v_tenant_id where tenant_id is null;
end $$;

-- ---------------------------------------------------------------------------
-- Step 5 (verification, not a mutation — run by hand before trusting Step 6):
--
--   select 'gps_devices' t, count(*) from gps_devices where tenant_id is null
--   union all select 'vehicles', count(*) from vehicles where tenant_id is null
--   union all select 'geofences', count(*) from geofences where tenant_id is null
--   union all select 'fleet_alerts', count(*) from fleet_alerts where tenant_id is null
--   union all select 'maintenance_logs', count(*) from maintenance_logs where tenant_id is null
--   union all select 'driver_performance', count(*) from driver_performance where tenant_id is null
--   union all select 'inventory_items', count(*) from inventory_items where tenant_id is null
--   union all select 'inventory_movements', count(*) from inventory_movements where tenant_id is null
--   union all select 'location_history', count(*) from location_history where tenant_id is null
--   union all select 'app_users', count(*) from app_users where tenant_id is null
--   union all select 'feedback', count(*) from feedback where tenant_id is null;
--
-- Every row must read 0 before Step 6 runs, or the NOT NULL constraints below
-- will fail loudly (which is the safe direction — better a failed migration
-- than a silently-unscoped row).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Step 6: lock tenant_id down now that every row has one.
-- ---------------------------------------------------------------------------
alter table gps_devices         alter column tenant_id set not null;
alter table vehicles            alter column tenant_id set not null;
alter table geofences           alter column tenant_id set not null;
alter table fleet_alerts        alter column tenant_id set not null;
alter table maintenance_logs    alter column tenant_id set not null;
alter table driver_performance  alter column tenant_id set not null;
alter table inventory_items     alter column tenant_id set not null;
alter table inventory_movements alter column tenant_id set not null;
alter table location_history    alter column tenant_id set not null;
alter table app_users           alter column tenant_id set not null;
alter table feedback            alter column tenant_id set not null;

-- ---------------------------------------------------------------------------
-- Step 7: foreign keys. ON DELETE RESTRICT on purpose — a tenant with any
-- data left should never be hard-deletable by accident; the platform-admin
-- "disable a tenant" lifecycle is a status flip (see tenants.status), not a
-- DELETE, so this should never actually fire in normal operation.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gps_devices_tenant_id_fkey') then
    alter table gps_devices add constraint gps_devices_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vehicles_tenant_id_fkey') then
    alter table vehicles add constraint vehicles_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'geofences_tenant_id_fkey') then
    alter table geofences add constraint geofences_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fleet_alerts_tenant_id_fkey') then
    alter table fleet_alerts add constraint fleet_alerts_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'maintenance_logs_tenant_id_fkey') then
    alter table maintenance_logs add constraint maintenance_logs_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'driver_performance_tenant_id_fkey') then
    alter table driver_performance add constraint driver_performance_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'inventory_items_tenant_id_fkey') then
    alter table inventory_items add constraint inventory_items_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'inventory_movements_tenant_id_fkey') then
    alter table inventory_movements add constraint inventory_movements_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'location_history_tenant_id_fkey') then
    alter table location_history add constraint location_history_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_users_tenant_id_fkey') then
    alter table app_users add constraint app_users_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'feedback_tenant_id_fkey') then
    alter table feedback add constraint feedback_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete restrict;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Step 8a: tenant_id indexes — every tenant-scoped query from here on filters
-- on this column, so it needs to be indexed on every table that has it.
-- ---------------------------------------------------------------------------
create index if not exists gps_devices_tenant_id_idx        on gps_devices (tenant_id);
create index if not exists vehicles_tenant_id_idx            on vehicles (tenant_id);
create index if not exists geofences_tenant_id_idx           on geofences (tenant_id);
create index if not exists fleet_alerts_tenant_id_idx        on fleet_alerts (tenant_id);
create index if not exists maintenance_logs_tenant_id_idx    on maintenance_logs (tenant_id);
create index if not exists driver_performance_tenant_id_idx  on driver_performance (tenant_id);
create index if not exists inventory_items_tenant_id_idx     on inventory_items (tenant_id);
create index if not exists inventory_movements_tenant_id_idx on inventory_movements (tenant_id);
create index if not exists location_history_tenant_id_idx    on location_history (tenant_id);
create index if not exists app_users_tenant_id_idx           on app_users (tenant_id);
create index if not exists feedback_tenant_id_idx            on feedback (tenant_id);

-- ---------------------------------------------------------------------------
-- Step 8b: composite (tenant_id, id) uniqueness — only where the primary key
-- is a human-assigned text id, so two tenants will eventually be able to each
-- have their own "V-101". This does NOT relax the existing plain `id` primary
-- key (still globally unique for now, by design — see the accompanying
-- report for why dropping that is a separate, later migration). Tables with
-- a uuid primary key (fleet_alerts, driver_performance, inventory_movements,
-- location_history, feedback) don't need this — a uuid can't collide.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gps_devices_tenant_id_id_key') then
    alter table gps_devices add constraint gps_devices_tenant_id_id_key unique (tenant_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vehicles_tenant_id_id_key') then
    alter table vehicles add constraint vehicles_tenant_id_id_key unique (tenant_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'geofences_tenant_id_id_key') then
    alter table geofences add constraint geofences_tenant_id_id_key unique (tenant_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'maintenance_logs_tenant_id_id_key') then
    alter table maintenance_logs add constraint maintenance_logs_tenant_id_id_key unique (tenant_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'inventory_items_tenant_id_id_key') then
    alter table inventory_items add constraint inventory_items_tenant_id_id_key unique (tenant_id, id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Step 9: tenant-aware RLS.
--
-- app_current_tenant_id() resolves the caller's tenant from auth.uid() (the
-- verified `sub` claim Supabase already puts in every JWT) by looking it up
-- in app_users — no custom JWT claims, no Auth Hook configuration, nothing
-- beyond plain SQL. It's SECURITY DEFINER so it can read app_users even
-- though app_users itself has no public RLS policy (unchanged, still
-- service-role-only): the function runs as its owner (the table owner,
-- which already bypasses app_users' RLS by default — that's what
-- SECURITY DEFINER buys here, not a separate privilege escalation).
--
-- Hardening applied:
--   - `set search_path = public` PLUS explicit `public.` qualification on
--     every object reference inside the body — belt-and-suspenders against
--     search-path hijacking. Neither alone is as clear to a future reader
--     as both together.
--   - The function body is fixed, non-parameterized SQL (no string
--     concatenation, no dynamic SQL) — its elevated privilege can only ever
--     perform this one exact lookup, nothing an attacker can redirect.
--   - EXECUTE is explicitly revoked from `public` and `anon` before being
--     granted to `authenticated`, so unauthenticated/anonymous callers can
--     never invoke it at all — not even to get the (harmless, always-NULL)
--     result an anon caller would otherwise get. Postgres grants EXECUTE to
--     PUBLIC by default on every new function, so the revoke is necessary,
--     not redundant.
--   - `authenticated` must be able to execute it: RLS policies are
--     evaluated as the querying role, and every tenant-owned table's
--     policies call this function — without EXECUTE, every query against
--     those tables would fail with "permission denied for function".
--   - If a user has no app_users row yet (e.g. an auth.users account mid
--     provisioning), the lookup returns NULL; `tenant_id = NULL` is NULL,
--     which Postgres RLS treats as false — the user sees nothing, which is
--     the correct fail-closed behavior, not an error.
-- ---------------------------------------------------------------------------
create or replace function public.app_current_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select tenant_id from public.app_users where id = auth.uid();
$$;

revoke execute on function public.app_current_tenant_id() from public;
revoke execute on function public.app_current_tenant_id() from anon;
grant execute on function public.app_current_tenant_id() to authenticated;

-- Every tenant-owned operational table gets all four command policies
-- (select/insert/update/delete), all enforcing the same predicate. This
-- replaces the old `public_read_*` policies (`using (true)`) entirely —
-- there is no more unscoped read access to any of these tables.
--
-- app_users, feedback, and changelog are NOT in this list — their access
-- model is unchanged (service-role-only for app_users/feedback; changelog
-- has never had RLS restrictions since it's platform-wide, not tenant data).
-- platform_admins does not exist yet (a later phase) and will follow the
-- same service-role-only posture as app_users when it's introduced.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'vehicles','gps_devices','geofences','fleet_alerts','maintenance_logs',
    'driver_performance','inventory_items','inventory_movements','location_history'
  ])
  loop
    -- Drop the old wide-open policy and any prior version of the policies
    -- below, so this whole block is safe to re-run.
    execute format('drop policy if exists %I on %I;', 'public_read_' || t, t);
    execute format('drop policy if exists %I on %I;', 'tenant_isolation_select_' || t, t);
    execute format('drop policy if exists %I on %I;', 'tenant_isolation_insert_' || t, t);
    execute format('drop policy if exists %I on %I;', 'tenant_isolation_update_' || t, t);
    execute format('drop policy if exists %I on %I;', 'tenant_isolation_delete_' || t, t);

    execute format(
      'create policy %I on %I for select using (tenant_id = public.app_current_tenant_id());',
      'tenant_isolation_select_' || t, t
    );
    execute format(
      'create policy %I on %I for insert with check (tenant_id = public.app_current_tenant_id());',
      'tenant_isolation_insert_' || t, t
    );
    execute format(
      'create policy %I on %I for update using (tenant_id = public.app_current_tenant_id()) with check (tenant_id = public.app_current_tenant_id());',
      'tenant_isolation_update_' || t, t
    );
    execute format(
      'create policy %I on %I for delete using (tenant_id = public.app_current_tenant_id());',
      'tenant_isolation_delete_' || t, t
    );
  end loop;
end $$;

-- =========================================================================
-- DEVICE AUTHENTICATION — per-device credential for /api/positions.
-- =========================================================================
-- A device (GPS-101, a physical tracker, etc.) currently authenticates to
-- POST /api/positions with nothing but its own device_id — a non-secret,
-- human-readable string already visible to any logged-in user of its own
-- tenant. This table plus the two functions below let the backend require
-- proof of possession of a per-device secret before accepting a position.
--
-- device_id is both the primary key AND the foreign key to gps_devices, so
-- there is structurally at most one credential row per device — Postgres's
-- own PK uniqueness constraint is what prevents "multiple active
-- credentials for one device" under concurrent registration/rotation, not
-- application logic. Rotation and revocation are therefore both single-row
-- UPDATEs on this one row — already atomic as single SQL statements, no
-- wrapping transaction needed for either.
--
-- token_hash stores only sha256(plaintext token) — the plaintext is never
-- persisted, logged, or returned except once, at issuance/rotation time, by
-- the backend route handler (not by anything in this schema file).
--
-- ON DELETE CASCADE from gps_devices matches this schema's existing
-- convention for tightly-owned child rows (fleet_alerts, location_history,
-- etc. already cascade from vehicles) and is the deliberate choice here:
-- once a device is deleted, its credential can never authenticate anything
-- again anyway (the device row it would resolve to is gone), so leaving an
-- orphaned row behind would serve no purpose and is exactly the "orphaned
-- credential" condition worth avoiding outright.
create table if not exists device_credentials (
  device_id text primary key references gps_devices(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete restrict,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists device_credentials_tenant_id_idx on device_credentials (tenant_id);

alter table device_credentials enable row level security;
-- No policy at all — service-role-only, same posture as app_users/feedback.
-- This table is never read or written through the anon/authenticated
-- PostgREST surface; only the backend's service-role connection (and the
-- two SECURITY DEFINER functions below, which run as their owner
-- regardless of the caller's role) ever touch it.

-- ---------------------------------------------------------------------------
-- create_device_with_credential: atomic "insert device row + insert its
-- first credential row" in one Postgres function body. This is the one
-- place in this feature that genuinely needs multi-table atomicity — the
-- backend's Supabase client only ever issues one REST call per statement,
-- so two separate .insert() calls from application code would NOT be
-- atomic (a device could be committed with no credential, or a credential
-- could reference a device that failed to insert). Wrapping both inserts in
-- one PL/pgSQL function body gives them Postgres's own implicit
-- single-transaction guarantee: if either insert raises, the whole
-- function's effects roll back together, including the first insert.
-- ---------------------------------------------------------------------------
create or replace function public.create_device_with_credential(
  p_id text,
  p_name text,
  p_imei text,
  p_assigned_vehicle_id text,
  p_tenant_id uuid,
  p_token_hash text
)
returns table (
  id text, name text, imei text, status text, battery_level numeric,
  signal_strength text, assigned_vehicle_id text, last_ping timestamptz, tenant_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.gps_devices (id, name, imei, assigned_vehicle_id, tenant_id)
  values (p_id, p_name, p_imei, p_assigned_vehicle_id, p_tenant_id);

  insert into public.device_credentials (device_id, tenant_id, token_hash)
  values (p_id, p_tenant_id, p_token_hash);

  return query
    select gd.id, gd.name, gd.imei, gd.status, gd.battery_level, gd.signal_strength,
           gd.assigned_vehicle_id, gd.last_ping, gd.tenant_id
    from public.gps_devices gd
    where gd.id = p_id;
end;
$$;

revoke execute on function public.create_device_with_credential(text, text, text, text, uuid, text) from public;
revoke execute on function public.create_device_with_credential(text, text, text, text, uuid, text) from anon;
revoke execute on function public.create_device_with_credential(text, text, text, text, uuid, text) from authenticated;
grant execute on function public.create_device_with_credential(text, text, text, text, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- validate_device_credential: the entire authentication decision for
-- POST /api/positions in one atomic statement. A single UPDATE ... FROM
-- ... WHERE ... RETURNING both (a) proves the presented token hashes to the
-- credential on file for exactly the claimed device_id, not revoked, with a
-- consistent tenant on both sides, AND (b) advances last_used_at, in the
-- same atomic operation — there is no gap between "checked the credential
-- was valid" and "recorded that it was used" for a concurrent revocation to
-- land in. GREATEST(dc.last_used_at, now()) is what makes concurrent
-- successful pings monotonic: whichever commits, the stored value can only
-- move forward, never backward, regardless of request arrival order.
--
-- Returns zero rows for EVERY failure case alike (unknown device_id, wrong
-- token, revoked, device_id/token mismatch, tenant inconsistency between
-- the two tables) — deliberately indistinguishable from the caller's
-- perspective, so the route handler can return one generic 401 without
-- creating a device-existence oracle.
-- ---------------------------------------------------------------------------
create or replace function public.validate_device_credential(p_device_id text, p_token_hash text)
returns table (assigned_vehicle_id text, tenant_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update public.device_credentials dc
    set last_used_at = greatest(dc.last_used_at, now())
    from public.gps_devices gd
    where dc.device_id = p_device_id
      and dc.token_hash = p_token_hash
      and dc.revoked_at is null
      and gd.id = dc.device_id
      and gd.tenant_id = dc.tenant_id
    returning gd.assigned_vehicle_id, dc.tenant_id;
end;
$$;

revoke execute on function public.validate_device_credential(text, text) from public;
revoke execute on function public.validate_device_credential(text, text) from anon;
revoke execute on function public.validate_device_credential(text, text) from authenticated;
grant execute on function public.validate_device_credential(text, text) to service_role;

-- =========================================================================
-- DEVICE PAIRING — QR/manual-code enrollment that hands a browser a device
-- credential without a human ever copying the plaintext token.
-- =========================================================================
-- device_credentials only ever stores a hash — by design, the plaintext is
-- never retrievable again after issuance/rotation. That means pairing can't
-- "look up and return the existing token"; it has to authorize a fresh
-- rotation and deliver the new token straight to the pairing browser instead
-- of to an admin's screen. A pairing code is therefore a short-lived,
-- single-use secret whose only power is "trigger one rotation, once."
--
-- Same conventions as device_credentials throughout: only a hash is ever
-- stored (code_hash, sha256 of the plaintext code — the plaintext exists
-- only in the one-time admin-facing response), RLS enabled with no policy
-- (service-role/security-definer-only), and the entire validate+consume+
-- rotate sequence happens in one atomic statement so there is no window for
-- the same code to be used twice or for a scan to race a manual entry.
create table if not exists device_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references gps_devices(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete restrict,
  code_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists device_pairing_codes_device_id_idx on device_pairing_codes (device_id);

alter table device_pairing_codes enable row level security;
-- No policy at all — same posture as device_credentials: never touched via
-- the anon/authenticated PostgREST surface, only the backend's service-role
-- connection and the security-definer function below.

-- ---------------------------------------------------------------------------
-- consume_pairing_code: the entire pairing decision in one atomic statement.
-- A CTE's UPDATE proves the presented code hashes to an unused, unexpired,
-- unrevoked row for exactly this device_id with a consistent tenant across
-- gps_devices and device_pairing_codes — and marks it used — in the same
-- operation that then upserts the new credential, so there is no gap between
-- "code was valid" and "code is now consumed" for a concurrent second
-- attempt with the same code to land in. If the UPDATE matches zero rows
-- (unknown device, wrong code, expired, already used, revoked, or a tenant
-- inconsistency), the CTE is empty, the INSERT selects nothing, and the
-- function returns zero rows — indistinguishable from every other failure
-- reason, exactly like validate_device_credential.
-- ---------------------------------------------------------------------------
-- The OUT parameter is deliberately NOT named device_id/tenant_id: PL/pgSQL's
-- `returns table (...)` creates OUT variables in the function's own namespace, and
-- if one shares a name with a column referenced anywhere in the query body,
-- Postgres can no longer tell whether a bare reference means the column or the
-- variable — surfacing as "column reference is ambiguous" even though every
-- reference below is already table-qualified. Naming it paired_device_id sidesteps
-- the collision entirely.
create or replace function public.consume_pairing_code(
  p_device_id text,
  p_code_hash text,
  p_new_token_hash text
)
returns table (paired_device_id text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    with consumed as (
      update public.device_pairing_codes pc
      set used_at = now()
      from public.gps_devices gd
      where pc.device_id = p_device_id
        and pc.code_hash = p_code_hash
        and pc.used_at is null
        and pc.expires_at > now()
        and gd.id = pc.device_id
        and gd.tenant_id = pc.tenant_id
      returning pc.device_id, pc.tenant_id
    )
    insert into public.device_credentials (device_id, tenant_id, token_hash, created_at, revoked_at)
    select c.device_id, c.tenant_id, p_new_token_hash, now(), null
    from consumed c
    on conflict (device_id) do update
      set token_hash = excluded.token_hash,
          created_at = excluded.created_at,
          revoked_at = null
    returning device_credentials.device_id;
end;
$$;

revoke execute on function public.consume_pairing_code(text, text, text) from public;
revoke execute on function public.consume_pairing_code(text, text, text) from anon;
revoke execute on function public.consume_pairing_code(text, text, text) from authenticated;
grant execute on function public.consume_pairing_code(text, text, text) to service_role;

-- =========================================================================
-- PLATFORM ADMIN — a cross-tenant operator role, orthogonal to the existing
-- tenant-scoped admin/manager/viewer roles on app_users.
-- =========================================================================
-- Deliberately NOT a column on app_users and NOT another value in its role
-- check constraint: those exist to answer "what can this person do inside
-- their own tenant," and every access path for that (RLS policies,
-- requireRole middleware) is built around "exactly one tenant." Platform
-- admin answers a different question — "can this person see across every
-- tenant at all" — so it's a separate allowlist the backend checks
-- explicitly (in requireAuth, service-role, same as everything else this
-- table's own posture protects), never something RLS policies reference.
-- A user can hold a normal tenant-scoped role AND be a platform admin at
-- the same time — the two are independent.
create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;
-- No policy at all — service-role-only, same posture as app_users/feedback/
-- device_credentials. Never reachable via the anon/authenticated PostgREST
-- surface, only the backend's own service-role connection.
