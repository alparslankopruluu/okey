import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { i18n } from '../i18n';

const DAILY_REWARDS = [250, 300, 350, 400, 500, 750, 1000] as const;

interface AppStore {
  language: 'tr' | 'en';
  appearance: 'light' | 'dark';
  reducedMotion: boolean;
  lowPerformance: boolean;
  musicPlaying: boolean;
  musicTrack: number;
  musicVolume: number;
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
  claimDaily(today: string): number;
  selectAvatar(index: number): void;
}

function previousCalendarDay(isoDay: string): string {
  const date = new Date(`${isoDay}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
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
      claimDaily: (today) => {
        const state = get();
        if (state.lastDailyClaim === today) return 0;
        const continued = state.lastDailyClaim === previousCalendarDay(today);
        const streak = continued ? Math.min(state.dailyStreak + 1, DAILY_REWARDS.length) : 1;
        const reward = DAILY_REWARDS[streak - 1] ?? DAILY_REWARDS[0];
        set({ lastDailyClaim: today, dailyStreak: streak, chips: state.chips + reward });
        return reward;
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
        chips: state.chips,
        dailyStreak: state.dailyStreak,
        lastDailyClaim: state.lastDailyClaim,
        avatarIndex: state.avatarIndex,
      }),
    },
  ),
);
