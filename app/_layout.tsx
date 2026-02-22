import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, Pressable } from 'react-native';
import { useAppInit } from '../src/hooks/useAppInit';
import { LoadingScreen } from '../src/components/ui/LoadingScreen';
import '../global.css';

export default function RootLayout() {
  const { isReady, error } = useAppInit();

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
              // In production, this would be a proper restart mechanism
            }}
            className="bg-accent-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (!isReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LoadingScreen />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
