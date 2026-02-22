import { useAuthStore } from '../../stores/useAuthStore';

/**
 * Returns the current authenticated user's ID.
 * Throws if no session exists (should only be called after auth gate).
 */
export function getCurrentUserId(): string {
  const userId = useAuthStore.getState().session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}
