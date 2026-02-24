import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'nativewind';
import { View, Text, Pressable } from 'react-native';
import { useAppInit } from '../src/hooks/useAppInit';
import { LoadingScreen } from '../src/components/ui/LoadingScreen';
import { ActiveCallScreen } from '../src/components/call/ActiveCallScreen';
import { VideoCallScreen } from '../src/components/call/VideoCallScreen';
import { IncomingCallScreen } from '../src/components/call/IncomingCallScreen';
import { ToastProvider } from '../src/components/ui/ToastProvider';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import '../global.css';

export default function RootLayout() {
  const { isReady, isAuthenticated, isAuthInitialized, error } = useAppInit();
  const theme = useSettingsStore((s) => s.theme);
  const { colorScheme, setColorScheme } = useColorScheme();
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  // Sync settings store theme → NativeWind color scheme
  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  // Phase 1: Auth check in progress — show splash
  if (!isAuthInitialized) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LoadingScreen />
      </GestureHandlerRootView>
    );
  }

  // Error during data store initialization
  if (error) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-background-primary items-center justify-center px-8">
          <Text className="text-status-error text-lg font-semibold mb-2">
            Something went wrong
          </Text>
          <Text className="text-text-secondary text-sm text-center mb-6">
            {error}
          </Text>
          <Pressable
            onPress={() => {
              // Reload the app by re-running initialization
            }}
            className="bg-accent-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    );
  }

  // Phase 2a: Not authenticated — show auth screens
  if (!isAuthenticated) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={statusBarStyle} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
        </Stack>
      </GestureHandlerRootView>
    );
  }

  // Phase 2b: Authenticated but stores still loading
  if (!isReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LoadingScreen message="Loading your data..." />
      </GestureHandlerRootView>
    );
  }

  // Phase 3: Fully initialized — show main app
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={statusBarStyle} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {/* Call screen overlays — rendered at root level to overlay entire app */}
      <ActiveCallScreen />
      <VideoCallScreen />
      <IncomingCallScreen />
      <ToastProvider />
    </GestureHandlerRootView>
  );
}
