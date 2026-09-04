import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { nanoid } from 'nanoid';
import { execute, queryOne, nowMs } from '../db/database';
import { indexEntity } from '../db/repositories/searchRepository';

const SESSION_KEY = 'swiftgram_current_user_id';

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

function randomSalt(): string {
  // 16 random bytes, hex-encoded — fine for local-device password storage.
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface LocalSession {
  userId: string;
  username: string;
}

export async function signup(username: string, password: string, displayName?: string): Promise<LocalSession> {
  const existing = await queryOne<{ id: string }>('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) throw new Error('That username is already taken on this device.');

  const salt = randomSalt();
  const hash = await hashPassword(password, salt);
  const id = nanoid();
  await execute(
    `INSERT INTO users (id, username, password_hash, password_salt, display_name, followers_count, following_count, posts_count, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?)`,
    [id, username, hash, salt, displayName ?? username, nowMs()]
  );
  await indexEntity(id, 'user', username);
  await SecureStore.setItemAsync(SESSION_KEY, id);
  return { userId: id, username };
}

export async function login(username: string, password: string): Promise<LocalSession> {
  const row = await queryOne<{ id: string; password_hash: string; password_salt: string }>(
    'SELECT id, password_hash, password_salt FROM users WHERE username = ?',
    [username]
  );
  if (!row) throw new Error('No account with that username on this device.');
  const hash = await hashPassword(password, row.password_salt);
  if (hash !== row.password_hash) throw new Error('Incorrect password.');
  await SecureStore.setItemAsync(SESSION_KEY, row.id);
  return { userId: row.id, username };
}

export async function restoreSession(): Promise<LocalSession | null> {
  const userId = await SecureStore.getItemAsync(SESSION_KEY);
  if (!userId) return null;
  const row = await queryOne<{ username: string }>('SELECT username FROM users WHERE id = ?', [userId]);
  if (!row) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
  return { userId, username: row.username };
}

export async function logout() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function switchAccount(userId: string) {
  await SecureStore.setItemAsync(SESSION_KEY, userId);
}

export async function listLocalAccounts() {
  return queryOne<any>('SELECT id, username, avatar_path FROM users ORDER BY created_at ASC');
}
