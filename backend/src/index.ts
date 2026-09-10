import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { vehiclesRouter } from './routes/vehicles.js';
import { positionsRouter } from './routes/positions.js';
import { crudRouter } from './routes/crud.js';
import { usersRouter } from './routes/users.js';
import { authRouter } from './routes/auth.js';
import { feedbackRouter } from './routes/feedback.js';

dotenv.config();

const app = express();
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

// Everything below requires a logged-in session; write access is further gated by role
// (see requireAuth/requireRole in each router).
app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/devices', crudRouter('gps_devices', { orderBy: 'last_ping', writeRoles: ['admin'] }));
app.use('/api/geofences', crudRouter('geofences'));
app.use('/api/alerts', crudRouter('fleet_alerts', { orderBy: 'timestamp' }));
app.use('/api/maintenance', crudRouter('maintenance_logs', { orderBy: 'due_date', ascending: true }));
app.use('/api/driver-performance', crudRouter('driver_performance'));
app.use('/api/inventory', crudRouter('inventory_items'));
app.use('/api/inventory-movements', crudRouter('inventory_movements', { orderBy: 'timestamp' }));
app.use('/api/users', usersRouter);
app.use('/api/feedback', feedbackRouter);

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Fleet Tracker API listening on port ${port}`);
});
