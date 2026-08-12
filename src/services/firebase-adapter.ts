import { ReactNativeFirebaseAppCheckProvider, initializeAppCheck } from '@react-native-firebase/app-check';
import { getAuth, signInAnonymously } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { getInitialNotification, getMessaging, getToken, onMessage, onNotificationOpenedApp, onTokenRefresh } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { parsePushPayload, type SafePushPayload } from './push-payload';

export interface PushRegistrationResult {
  readonly installationId: string;
  readonly permissionGranted: boolean;
}

/** Provider code stays out of screens. Call only after the contextual permission education UI. */
export class FirebaseMobileAdapter {
  public async ensureAnonymousSession(): Promise<string> {
    const auth = getAuth();
    const current = auth.currentUser ?? (await signInAnonymously(auth)).user;
    return current.uid;
  }

  public activateAppCheck(debug = false): void {
    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({ android: { provider: debug ? 'debug' : 'playIntegrity' }, apple: { provider: debug ? 'debug' : 'appAttestWithDeviceCheckFallback' } });
    initializeAppCheck(undefined, { provider, isTokenAutoRefreshEnabled: true });
  }

  public async registerForPush(installationId: string, permissionGranted: boolean): Promise<PushRegistrationResult> {
    const messaging = getMessaging();
    if (!permissionGranted) return { installationId, permissionGranted: false };
    const token = await getToken(messaging);
    await httpsCallable(getFunctions(), 'registerDevice')({ installationId, token, platform: Platform.OS });
    return { installationId, permissionGranted: true };
  }

  public onTokenRefresh(installationId: string): () => void {
    return onTokenRefresh(getMessaging(), (token) => { void httpsCallable(getFunctions(), 'registerDevice')({ installationId, token, platform: Platform.OS }); });
  }

  public onForegroundPush(listener: (payload: SafePushPayload) => void): () => void {
    return onMessage(getMessaging(), (message) => {
      const payload = parsePushPayload(message.data);
      if (payload !== undefined) listener(payload);
    });
  }

  public onNotificationOpened(listener: (payload: SafePushPayload) => void): () => void {
    return onNotificationOpenedApp(getMessaging(), (message) => {
      const payload = parsePushPayload(message.data);
      if (payload !== undefined) listener(payload);
    });
  }

  public async initialNotification(): Promise<SafePushPayload | undefined> {
    const message = await getInitialNotification(getMessaging());
    return parsePushPayload(message?.data);
  }
}
