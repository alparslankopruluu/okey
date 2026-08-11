import '../src/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '../src/stores/app-store';

export default function RootLayout() {
  const appearance = useAppStore((state) => state.appearance);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={appearance === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="rooms" options={{ presentation: 'card' }} />
          <Stack.Screen name="create-room" options={{ presentation: 'formSheet' }} />
          <Stack.Screen name="offline" options={{ presentation: 'card' }} />
          <Stack.Screen name="game/[roomId]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="safety" options={{ presentation: 'card' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
