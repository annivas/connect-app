import { Stack } from 'expo-router';
import { useThemeColors } from '../../../src/hooks/useThemeColors';

export default function SettingsLayout() {
  const themeColors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background.primary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="storage" />
      <Stack.Screen name="help" />
      <Stack.Screen name="feedback" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
