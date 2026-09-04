import { create } from 'zustand';
import * as localAuth from '../services/localAuth';
import { onboardNewUser } from '../services/seedData';
import type { LocalSession } from '../services/localAuth';

interface AuthState {
  session: LocalSession | null;
  isBootstrapping: boolean;
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isBootstrapping: true,
  bootstrap: async () => {
    const session = await localAuth.restoreSession();
    set({ session, isBootstrapping: false });
  },
  login: async (username, password) => {
    const session = await localAuth.login(username, password);
    set({ session });
  },
  signup: async (username, password, displayName) => {
    const session = await localAuth.signup(username, password, displayName);
    set({ session });
    await onboardNewUser(session.userId);
  },
  logout: async () => {
    await localAuth.logout();
    set({ session: null });
  },
}));
