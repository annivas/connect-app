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

/**
 * Generate a UUID v4 string.
 * Uses the Web Crypto API when available (Hermes supports it at runtime
 * even though React Native's TS types don't declare it), with a
 * Math.random fallback for older engines.
 */
export function generateUUID(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }
  // RFC 4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
