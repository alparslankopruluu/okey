import '../src/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '../src/stores/app-store';
import { AudioProvider } from '../src/audio/audio-provider';

export default function RootLayout() {
  const appearance = useAppStore((state) => state.appearance);
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AudioProvider>
          <StatusBar style={appearance === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? 'none' : 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="rooms" options={{ presentation: 'card' }} />
          <Stack.Screen name="create-room" options={{ presentation: 'formSheet' }} />
          <Stack.Screen name="offline" options={{ presentation: 'card' }} />
          <Stack.Screen name="game/[roomId]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="safety" options={{ presentation: 'card' }} />
          </Stack>
        </AudioProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
