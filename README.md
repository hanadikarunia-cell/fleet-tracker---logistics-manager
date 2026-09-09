# Fleet Tracker & Logistics Manager

A real-time GPS fleet tracking and logistics management system: live vehicle
positions, geofence enter/exit alerts, maintenance logs, driver performance,
and inventory tracking — backed by a real Postgres database (Supabase), a
Node/Express API, and pushed to the browser over Supabase Realtime.

This is a personal/portfolio project, not affiliated with any organization.

## Monorepo layout

```
/frontend   React + Vite + TypeScript dashboard (Leaflet map, all fleet views)
/backend    Express + TypeScript API (Supabase client, geofence engine)
```

## How it fits together

```
Phone browser (track.html) ──POST /api/positions──▶ backend ──▶ Postgres (Supabase)
                                                         │
Dashboard (index.html) ──REST fetch on load────────────▶│
Dashboard ◀──Supabase Realtime (vehicles, fleet_alerts)──┘
```

- The **backend** is the only thing that writes to the database (using the
  Supabase *service role* key). On every position ping it records history,
  updates the vehicle's live position, and checks active geofences
  (circle or polygon) for enter/exit crossings, inserting an alert row when
  one happens.
- The **frontend** fetches its initial data from the backend's REST API,
  then subscribes directly to Supabase Realtime (using the *publishable/anon*
  key, safe for the browser) for live vehicle and alert updates — no polling.

## 1. Provision the database

1. Create a Supabase project and grab its Project URL, `service_role` secret
   key, and Postgres connection string (Project Settings → Database) and its
   `anon`/publishable key (Project Settings → API).
2. In `backend/`, copy `.env.example` to `.env` and fill in `SUPABASE_URL`,
   `SUPABASE_SECRET_KEY`, and `DATABASE_URL`.
3. Install and apply the schema:
   ```bash
   cd backend
   npm install
   npm run migrate   # applies backend/src/db/schema.sql
   npm run seed       # seeds one demo device/vehicle (GPS-101 / V-101) + an admin user
   ```
   Both are idempotent — safe to re-run.

## 2. Run the backend

```bash
cd backend
npm run dev     # http://localhost:3001
```

See `backend/src/index.ts` for the full route list. Key endpoints:

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/positions` | Ingest a GPS ping — `{device_id, lat, lng, speed, heading, timestamp}` |
| GET | `/api/vehicles` | All vehicles with their latest position |
| GET | `/api/vehicles/:id/history` | Location history for one vehicle |
| CRUD | `/api/vehicles`, `/api/devices`, `/api/geofences`, `/api/alerts`, `/api/maintenance`, `/api/driver-performance`, `/api/inventory`, `/api/inventory-movements`, `/api/users` | Standard REST |

## 3. Run the frontend

```bash
cd frontend
npm install
cp .env.example .env
# Fill in VITE_API_URL (http://localhost:3001 for local dev),
# VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY (the publishable/anon key — never the secret key)
npm run dev     # http://localhost:3000
```

Without `VITE_SUPABASE_ANON_KEY` set, the dashboard still works (REST fetch +
CRUD) but won't receive live pushes — it'll only update on next reload.

## 4. Track your phone as a real device

Open `http://localhost:3000/track.html` (or `/track` once deployed) on your
phone's browser, confirm the Device ID matches a registered device
(`GPS-101` is pre-seeded and assigned to vehicle `V-101`), and hit
**Start Tracking**. It uses `navigator.geolocation.watchPosition` and posts
a real position to `/api/positions` every 7 seconds — watch it move live on
the dashboard's map before you ever buy dedicated hardware.

To track additional vehicles, register a new device + vehicle from the
dashboard's GPS Hardware Register / Fleet Directory tabs first, then enter
that device's ID on `/track.html`.

## 5. Deploy

**Database:** already live on Supabase from step 1.

**Backend → Render:** `render.yaml` at the repo root is a Render Blueprint.
In the Render dashboard, "New +" → "Blueprint", point it at this repo, and
it will create the `fleet-tracker-backend` web service from `backend/`. Set
`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, and `CORS_ORIGIN`
(your deployed frontend's origin) in the Render dashboard — they're marked
`sync: false` so Render prompts for them instead of committing secrets.

**Frontend → Vercel:** create a new Vercel project from this repo with
**Root Directory** set to `frontend` (`frontend/vercel.json` supplies the
build settings). Set `VITE_API_URL` to your Render backend's URL,
`VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` in the Vercel project's
environment variables, then deploy. The phone tracker will be live at
`https://<your-app>.vercel.app/track`.

After both are deployed, update the backend's `CORS_ORIGIN` to the real
Vercel URL (it starts as a placeholder) and redeploy the backend.

## Notes

- `SUPABASE_SECRET_KEY` (service role) must only ever live in the backend's
  environment — it bypasses Row Level Security. The frontend only ever uses
  the `anon`/publishable key, which is safe to expose in the browser (RLS
  restricts it to read-only).
- Row Level Security is enabled on every table with a public read policy;
  all writes go through the backend.
