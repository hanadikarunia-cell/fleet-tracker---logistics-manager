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
