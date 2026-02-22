import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/useAuthStore';

export default function Index() {
  const session = useAuthStore((s) => s.session);

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href="/(tabs)/messages" />;
}
