import { ReactNativeFirebaseAppCheckProvider, initializeAppCheck } from '@react-native-firebase/app-check';
import { getAuth, signInAnonymously } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { getInitialNotification, getMessaging, getToken, onMessage, onNotificationOpenedApp, onTokenRefresh } from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { parsePushPayload, type SafePushPayload } from './push-payload';

export interface PushRegistrationResult {
  readonly installationId: string;
  readonly permissionGranted: boolean;
}

export function isFirebaseNativeConfigured(): boolean {
  return Constants.expoConfig?.extra?.firebaseNativeConfigured === true;
}

export function createFirebaseMobileAdapter(): FirebaseMobileAdapter | undefined {
  return isFirebaseNativeConfigured() ? new FirebaseMobileAdapter() : undefined;
}

/** Provider code stays out of screens. Call only after the contextual permission education UI. */
export class FirebaseMobileAdapter {
  public async ensureAnonymousSession(): Promise<string> {
    this.requireConfigured();
    const auth = getAuth();
    const current = auth.currentUser ?? (await signInAnonymously(auth)).user;
    return current.uid;
  }

  public activateAppCheck(debug = false): void {
    this.requireConfigured();
    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({ android: { provider: debug ? 'debug' : 'playIntegrity' }, apple: { provider: debug ? 'debug' : 'appAttestWithDeviceCheckFallback' } });
    initializeAppCheck(undefined, { provider, isTokenAutoRefreshEnabled: true });
  }

  public async registerForPush(installationId: string, permissionGranted: boolean): Promise<PushRegistrationResult> {
    this.requireConfigured();
    const messaging = getMessaging();
    if (!permissionGranted) return { installationId, permissionGranted: false };
    const token = await getToken(messaging);
    await httpsCallable(getFunctions(), 'registerDevice')({ installationId, token, platform: Platform.OS });
    return { installationId, permissionGranted: true };
  }

  public onTokenRefresh(installationId: string): () => void {
    this.requireConfigured();
    return onTokenRefresh(getMessaging(), (token) => { void httpsCallable(getFunctions(), 'registerDevice')({ installationId, token, platform: Platform.OS }); });
  }

  public onForegroundPush(listener: (payload: SafePushPayload) => void): () => void {
    this.requireConfigured();
    return onMessage(getMessaging(), (message) => {
      const payload = parsePushPayload(message.data);
      if (payload !== undefined) listener(payload);
    });
  }

  public onNotificationOpened(listener: (payload: SafePushPayload) => void): () => void {
    this.requireConfigured();
    return onNotificationOpenedApp(getMessaging(), (message) => {
      const payload = parsePushPayload(message.data);
      if (payload !== undefined) listener(payload);
    });
  }

  public async initialNotification(): Promise<SafePushPayload | undefined> {
    this.requireConfigured();
    const message = await getInitialNotification(getMessaging());
    return parsePushPayload(message?.data);
  }

  private requireConfigured(): void {
    if (!isFirebaseNativeConfigured()) throw new Error('Firebase native configuration is not installed in this development build');
  }
}
