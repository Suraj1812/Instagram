import { supabase } from './supabaseClient';

// Supabase Auth is email/password based, but SwiftGram's UI only ever asks
// for a username. We map every username to a deterministic, never-shown
// synthetic email (username@swiftgram.app) so the rest of the app — and
// every screen that calls signup()/login() — never has to know that.
function syntheticEmail(username: string): string {
  return `${username.trim().toLowerCase()}@swiftgram.app`;
}

export interface LocalSession {
  userId: string;
  username: string;
}

export async function signup(username: string, password: string, displayName?: string): Promise<LocalSession> {
  const clean = username.trim();
  const { data: existing } = await supabase.from('profiles').select('id').eq('username', clean).maybeSingle();
  if (existing) throw new Error('That username is already taken.');

  const { data, error } = await supabase.auth.signUp({
    email: syntheticEmail(clean),
    password,
    options: { data: { username: clean, display_name: displayName ?? clean } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Signup failed — please try again.');

  return { userId: data.user.id, username: clean };
}

export async function login(username: string, password: string): Promise<LocalSession> {
  const clean = username.trim();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(clean),
    password,
  });
  if (!error && data.user) return { userId: data.user.id, username: clean };

  // Demo accounts created by the original seeder used the old .local domain.
  // Keep this read-only fallback so existing showcase accounts remain usable
  // while all new signups continue using the valid .app domain above.
  const legacy = await supabase.auth.signInWithPassword({
    email: `${clean.toLowerCase()}@swiftgram.local`,
    password,
  });
  if (legacy.error || !legacy.data.user) throw new Error('Incorrect username or password.');
  return { userId: legacy.data.user.id, username: clean };
}

export async function restoreSession(): Promise<LocalSession | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
  if (!profile) return null;
  return { userId: user.id, username: profile.username };
}

export async function logout() {
  await supabase.auth.signOut();
}
