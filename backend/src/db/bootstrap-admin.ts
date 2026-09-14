// Creates the first real admin login: a Supabase Auth account plus its app_users profile.
// Usage: npm run bootstrap-admin -- <email> <password> <name>
// Safe to re-run with the same email — it updates the existing account's password/profile
// instead of failing.
import dotenv from 'dotenv';
import { supabase } from '../supabaseClient.js';

dotenv.config();

async function main() {
  const [email, password, ...nameParts] = process.argv.slice(2);
  const name = nameParts.join(' ');
  if (!email || !password || !name) {
    console.error('Usage: npm run bootstrap-admin -- <email> <password> <name>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = existingUsers.users.find((u) => u.email === email);

  const userId = existing
    ? existing.id
    : await (async () => {
        const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) throw error;
        return data.user.id;
      })();

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(userId, { password });
    if (error) throw error;
  }

  // tenant_id is required (Phase 1). This script only ever provisions the bootstrap
  // tenant created by schema.sql — not a redesign, just the minimum lookup needed so
  // the existing upsert satisfies the NOT NULL constraint.
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', 'tangerang-logistics')
    .single();
  if (tenantError || !tenant) {
    throw tenantError ?? new Error('Bootstrap tenant "tangerang-logistics" not found — has Phase 1 been migrated?');
  }

  const { error: profileError } = await supabase.from('app_users').upsert({
    id: userId,
    name,
    email,
    role: 'admin',
    department: 'Fleet Operations',
    tenant_id: tenant.id,
  });
  if (profileError) throw profileError;

  console.log(`Admin account ready: ${email} (role: admin). Sign in at /  with this email and the password you set.`);
}

main().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
