import { supabase } from './supabaseClient';

/**
 * Called right after a real signup so the brand-new account doesn't open to
 * an empty app. All the actual work (auto-follow a few demo accounts, drop
 * a welcome DM) happens server-side in the `onboard_new_user` Postgres
 * function — see supabase/schema.sql — since some of it (sending a message
 * "as" a demo account) can't be done under normal client permissions.
 *
 * Demo accounts themselves are seeded once, centrally, by running
 * `node scripts/seed.js` against your Supabase project — see that file.
 */
export async function onboardNewUser(_newUserId: string) {
  const { error } = await supabase.rpc('onboard_new_user');
  if (error) {
    // Non-fatal: worst case a new signup just doesn't get demo follows/DM
    // (e.g. scripts/seed.js hasn't been run yet). Don't block signup on it.
    console.warn('[onboardNewUser] onboard_new_user RPC failed:', error.message);
  }
}
