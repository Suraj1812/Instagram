import { create } from 'zustand';
import { getMeta, setMeta } from '../db/repositories/metaRepository';

interface OnboardingState {
  completed: boolean | null; // null = not yet checked
  hydrate: () => Promise<void>;
  complete: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  completed: null,
  hydrate: async () => {
    const flag = await getMeta('onboarding_complete');
    set({ completed: flag === 'true' });
  },
  complete: async () => {
    await setMeta('onboarding_complete', 'true');
    set({ completed: true });
  },
}));
