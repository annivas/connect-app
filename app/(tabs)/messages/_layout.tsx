import { Stack } from 'expo-router';
import { useThemeColors } from '../../../src/hooks/useThemeColors';

export default function MessagesLayout() {
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
      <Stack.Screen name="[id]" />
      <Stack.Screen name="info" />
      <Stack.Screen name="section-detail" />
      <Stack.Screen name="shared-detail" />
      <Stack.Screen name="note-detail" />
    </Stack>
  );
}
