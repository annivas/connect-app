import { Stack } from 'expo-router';
import { useThemeColors } from '../../src/hooks/useThemeColors';

export default function AuthLayout() {
  const themeColors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background.primary },
        animation: 'slide_from_right',
      }}
    />
  );
}
