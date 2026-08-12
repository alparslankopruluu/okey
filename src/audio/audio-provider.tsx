import { useAudioPlayer } from 'expo-audio';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAppStore } from '../stores/app-store';
import { audioAssets, type GameSound } from './assets';

interface AudioContextValue {
  playEffect(sound: GameSound): void;
  setTableAudio(active: boolean, seed?: number): void;
  setVoiceActive(active: boolean): void;
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

export function AudioProvider({ children }: { readonly children: ReactNode }) {
  const musicPlaying = useAppStore((state) => state.musicPlaying);
  const musicTrack = useAppStore((state) => state.musicTrack);
  const musicVolume = useAppStore((state) => state.musicVolume);
  const effectsEnabled = useAppStore((state) => state.effectsEnabled);
  const effectsVolume = useAppStore((state) => state.effectsVolume);
  const ambientEnabled = useAppStore((state) => state.ambientEnabled);
  const ambientVolume = useAppStore((state) => state.ambientVolume);
  const music = useAudioPlayer(audioAssets.music[0]);
  const ambient = useAudioPlayer(audioAssets.ambient);
  const tilePickup = useAudioPlayer(audioAssets.effects.tilePickup);
  const tileDiscard = useAudioPlayer(audioAssets.effects.tileDiscard);
  const meldOpen = useAudioPlayer(audioAssets.effects.meldOpen);
  const warning = useAudioPlayer(audioAssets.effects.warning);
  const gift = useAudioPlayer(audioAssets.effects.gift);
  const win = useAudioPlayer(audioAssets.effects.win);
  const [voiceActive, setVoiceActive] = useState(false);
  const [table, setTable] = useState<{ readonly active: boolean; readonly seed: number }>({ active: false, seed: 0 });
  const appActive = useRef(true);
  const ambientCount = useRef(0);

  const players = useMemo(() => ({ tilePickup, tileDiscard, meldOpen, warning, gift, win }), [gift, meldOpen, tileDiscard, tilePickup, warning, win]);

  useEffect(() => {
    const source = audioAssets.music[musicTrack % audioAssets.music.length] ?? audioAssets.music[0];
    music.replace(source);
    music.loop = true;
    if (musicPlaying && appActive.current) music.play();
  }, [music, musicPlaying, musicTrack]);

  useEffect(() => {
    music.volume = musicVolume * (voiceActive ? 0.24 : 1);
    ambient.volume = ambientVolume * (voiceActive ? 0.1 : 1);
    for (const player of Object.values(players)) player.volume = effectsVolume * (voiceActive ? 0.62 : 1);
  }, [ambient, ambientVolume, effectsVolume, music, musicVolume, players, voiceActive]);

  useEffect(() => {
    if (!musicPlaying || !appActive.current) music.pause();
    else music.play();
  }, [music, musicPlaying]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      appActive.current = state === 'active';
      if (!appActive.current) {
        music.pause();
        ambient.pause();
        for (const player of Object.values(players)) player.pause();
      } else if (musicPlaying) music.play();
    });
    return () => subscription.remove();
  }, [ambient, music, musicPlaying, players]);

  useEffect(() => {
    if (!table.active || !ambientEnabled) {
      ambient.pause();
      return undefined;
    }
    const schedule = (): ReturnType<typeof setTimeout> => {
      const seconds = 100 + ((table.seed + ambientCount.current * 17) % 41);
      return setTimeout(() => {
        if (appActive.current && !voiceActive) {
          void ambient.seekTo(0).then(() => ambient.play());
        }
        ambientCount.current += 1;
        timer = schedule();
      }, seconds * 1000);
    };
    let timer = schedule();
    return () => clearTimeout(timer);
  }, [ambient, ambientEnabled, table, voiceActive]);

  const playEffect = useCallback((sound: GameSound) => {
    if (!effectsEnabled || !appActive.current) return;
    const player = players[sound];
    void player.seekTo(0).then(() => player.play());
  }, [effectsEnabled, players]);
  const setTableAudio = useCallback((active: boolean, seed = 0) => setTable({ active, seed }), []);
  const value = useMemo(() => ({ playEffect, setTableAudio, setVoiceActive }), [playEffect, setTableAudio]);
  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useLumaAudio(): AudioContextValue {
  const value = useContext(AudioContext);
  if (value === undefined) throw new Error('useLumaAudio must be used inside AudioProvider');
  return value;
}
