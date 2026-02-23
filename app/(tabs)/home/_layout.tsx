import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFF8F0' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="notes" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="reminders" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="expenses" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
