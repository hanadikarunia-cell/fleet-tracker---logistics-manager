import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

// Login itself happens client-side via supabase-js (signInWithPassword) against Supabase Auth
// directly — this backend never sees a password. This endpoint just resolves a valid session
// token into the caller's app profile (id/name/role/email).
authRouter.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});
