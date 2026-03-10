import { Stack } from 'expo-router';
import { useThemeColors } from '../../../src/hooks/useThemeColors';

export default function HomeLayout() {
  const themeColors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background.primary },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="notes" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="reminders" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="expenses" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="events" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
