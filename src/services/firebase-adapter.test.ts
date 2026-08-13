import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-constants', () => ({ default: { expoConfig: { extra: { firebaseNativeConfigured: false } } } }));
vi.mock('@react-native-firebase/app-check', () => ({ ReactNativeFirebaseAppCheckProvider: class { public configure(): void { /* test double */ } }, initializeAppCheck: vi.fn() }));
vi.mock('@react-native-firebase/auth', () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn() }));
vi.mock('@react-native-firebase/functions', () => ({ getFunctions: vi.fn(), httpsCallable: vi.fn() }));
vi.mock('@react-native-firebase/messaging', () => ({
  getInitialNotification: vi.fn(), getMessaging: vi.fn(), getToken: vi.fn(), onMessage: vi.fn(), onNotificationOpenedApp: vi.fn(), onTokenRefresh: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

describe('Firebase mobile provider gate', () => {
  it('does not construct a provider adapter without both ignored native configs', async () => {
    const { createFirebaseMobileAdapter, isFirebaseNativeConfigured } = await import('./firebase-adapter');
    expect(isFirebaseNativeConfigured()).toBe(false);
    expect(createFirebaseMobileAdapter()).toBeUndefined();
  });
});
