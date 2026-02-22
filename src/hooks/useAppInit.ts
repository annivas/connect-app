import { useEffect, useState } from 'react';
import { useMessagesStore } from '../stores/useMessagesStore';
import { useGroupsStore } from '../stores/useGroupsStore';
import { useUserStore } from '../stores/useUserStore';
import { useHomeStore } from '../stores/useHomeStore';

export function useAppInit() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        await Promise.all([
          useUserStore.getState().init(),
          useMessagesStore.getState().init(),
          useGroupsStore.getState().init(),
          useHomeStore.getState().init(),
        ]);
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize app');
      }
    }

    initialize();
  }, []);

  return { isReady, error };
}
