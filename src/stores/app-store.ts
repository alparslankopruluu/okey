import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { i18n } from '../i18n';
import { calculateDailyClaim } from '../services/economy';

interface AppStore {
  language: 'tr' | 'en';
  appearance: 'light' | 'dark';
  reducedMotion: boolean;
  lowPerformance: boolean;
  musicPlaying: boolean;
  musicTrack: number;
  musicVolume: number;
  effectsEnabled: boolean;
  effectsVolume: number;
  ambientEnabled: boolean;
  ambientVolume: number;
  chips: number;
  dailyStreak: number;
  lastDailyClaim?: string;
  avatarIndex: number;
  setLanguage(language: 'tr' | 'en'): void;
  toggleAppearance(): void;
  toggleReducedMotion(): void;
  toggleLowPerformance(): void;
  toggleMusic(): void;
  nextMusicTrack(): void;
  setMusicVolume(volume: number): void;
  toggleEffects(): void;
  setEffectsVolume(volume: number): void;
  toggleAmbient(): void;
  setAmbientVolume(volume: number): void;
  claimDaily(today: string): number;
  spendChips(amount: number): boolean;
  selectAvatar(index: number): void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      language: i18n.language === 'tr' ? 'tr' : 'en',
      appearance: 'dark',
      reducedMotion: false,
      lowPerformance: false,
      musicPlaying: false,
      musicTrack: 0,
      musicVolume: 0.55,
      effectsEnabled: true,
      effectsVolume: 0.32,
      ambientEnabled: false,
      ambientVolume: 0.12,
      chips: 5000,
      dailyStreak: 0,
      avatarIndex: 0,
      setLanguage: (language) => {
        void i18n.changeLanguage(language);
        set({ language });
      },
      toggleAppearance: () => set((state) => ({ appearance: state.appearance === 'dark' ? 'light' : 'dark' })),
      toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
      toggleLowPerformance: () => set((state) => ({ lowPerformance: !state.lowPerformance })),
      toggleMusic: () => set((state) => ({ musicPlaying: !state.musicPlaying })),
      nextMusicTrack: () => set((state) => ({ musicTrack: (state.musicTrack + 1) % 3 })),
      setMusicVolume: (volume) => set({ musicVolume: Math.max(0, Math.min(1, volume)) }),
      toggleEffects: () => set((state) => ({ effectsEnabled: !state.effectsEnabled })),
      setEffectsVolume: (volume) => set({ effectsVolume: Math.max(0, Math.min(1, volume)) }),
      toggleAmbient: () => set((state) => ({ ambientEnabled: !state.ambientEnabled })),
      setAmbientVolume: (volume) => set({ ambientVolume: Math.max(0, Math.min(1, volume)) }),
      claimDaily: (today) => {
        const state = get();
        const dailyState = state.lastDailyClaim === undefined
          ? { streak: state.dailyStreak }
          : { streak: state.dailyStreak, lastClaimDay: state.lastDailyClaim };
        const result = calculateDailyClaim(dailyState, today);
        if (result.duplicate) return 0;
        set({ lastDailyClaim: result.lastClaimDay, dailyStreak: result.streak, chips: state.chips + result.reward });
        return result.reward;
      },
      spendChips: (amount) => {
        const state = get();
        if (!Number.isSafeInteger(amount) || amount <= 0 || state.chips < amount) return false;
        set({ chips: state.chips - amount });
        return true;
      },
      selectAvatar: (avatarIndex) => set({ avatarIndex }),
    }),
    {
      name: 'luma-okey-preferences-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        appearance: state.appearance,
        reducedMotion: state.reducedMotion,
        lowPerformance: state.lowPerformance,
        musicPlaying: state.musicPlaying,
        musicTrack: state.musicTrack,
        musicVolume: state.musicVolume,
        effectsEnabled: state.effectsEnabled,
        effectsVolume: state.effectsVolume,
        ambientEnabled: state.ambientEnabled,
        ambientVolume: state.ambientVolume,
        chips: state.chips,
        dailyStreak: state.dailyStreak,
        lastDailyClaim: state.lastDailyClaim,
        avatarIndex: state.avatarIndex,
      }),
    },
  ),
);
