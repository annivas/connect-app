import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useMessagesStore } from '../stores/useMessagesStore';
import { useGroupsStore } from '../stores/useGroupsStore';
import { useUserStore } from '../stores/useUserStore';
import { useHomeStore } from '../stores/useHomeStore';
import { useAIStore } from '../stores/useAIStore';

export function useAppInit() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = useAuthStore((s) => s.session);
  const isAuthInitialized = useAuthStore((s) => s.isInitialized);

  // Phase 1: Initialize auth (check for existing session)
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  // Phase 2: Once authenticated, load data stores
  useEffect(() => {
    if (!isAuthInitialized || !session) {
      // Reset ready state when session is lost (sign-out)
      setIsReady(false);
      return;
    }

    async function loadStores() {
      try {
        await Promise.all([
          useUserStore.getState().init(),
          useMessagesStore.getState().init(),
          useGroupsStore.getState().init(),
          useHomeStore.getState().init(),
        ]);
        // AI store init is synchronous (mock data), no need to await
        useAIStore.getState().init();
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize app');
      }
    }

    loadStores();
  }, [isAuthInitialized, session]);

  return { isReady, isAuthenticated: !!session, isAuthInitialized, error };
}
