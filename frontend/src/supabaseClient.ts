import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Uses the publishable/anon key — safe to expose in the browser. Handles real login
// (signInWithPassword) and Realtime subscriptions. All data writes still go through the
// backend API (src/api.ts), which verifies the session token and uses the service-role key.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
