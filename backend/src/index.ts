import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { vehiclesRouter } from './routes/vehicles.js';
import { positionsRouter } from './routes/positions.js';
import { crudRouter } from './routes/crud.js';
import { devicesRouter } from './routes/devices.js';
import { pairingRouter } from './routes/pairing.js';
import { usersRouter } from './routes/users.js';
import { authRouter } from './routes/auth.js';
import { feedbackRouter } from './routes/feedback.js';
import { changelogRouter } from './routes/changelog.js';

dotenv.config();

const app = express();
// Render sits in front of this app as exactly one reverse-proxy hop. Trusting a
// specific hop count (not `true`, which trusts an unbounded chain and takes the
// LEFTMOST X-Forwarded-For entry) matters here: Render appends the real client IP
// rather than replacing the header, so a caller who sends their own fake
// X-Forwarded-For would have it forwarded as "attacker-value, real-ip" — with
// `true`, Express would trust the attacker-supplied leftmost value as req.ip,
// letting them trivially spoof past the pairing endpoint's IP-based rate limiter.
// `1` correctly walks in exactly one hop from the right and uses the real IP
// Render observed, ignoring anything a client tried to prepend.
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    name: 'Fleet Tracker API',
    status: 'ok',
    docs: 'This is a JSON API, not a web page. See /api/health and /api/vehicles.',
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Device ingest — no login, matches how a phone or physical GPS unit calls this.
app.use('/api/positions', positionsRouter);

// Device pairing (POST /api/devices/:id/pair) — also no login, same trust boundary
// as positions above. Mounted before devicesRouter so this one path is matched
// first; every other /api/devices/* path falls through to the authenticated router.
app.use('/api/devices', pairingRouter);

// Everything below requires a logged-in session; write access is further gated by role
// (see requireAuth/requireRole in each router).
app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/geofences', crudRouter('geofences'));
app.use('/api/alerts', crudRouter('fleet_alerts', { orderBy: 'timestamp' }));
app.use('/api/maintenance', crudRouter('maintenance_logs', { orderBy: 'due_date', ascending: true }));
app.use('/api/driver-performance', crudRouter('driver_performance'));
app.use('/api/inventory', crudRouter('inventory_items'));
app.use('/api/inventory-movements', crudRouter('inventory_movements', { orderBy: 'timestamp' }));
app.use('/api/users', usersRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/changelog', changelogRouter);

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Fleet Tracker API listening on port ${port}`);
});
