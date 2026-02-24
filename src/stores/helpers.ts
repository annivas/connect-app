/**
 * Store helper functions that break circular dependency chains.
 *
 * Stores like useMessagesStore and useGroupsStore need to look up user data
 * (current user ID, user names) from useUserStore. Importing useUserStore
 * directly creates circular dependencies. These helpers use lazy getState()
 * access to avoid the circular import at module evaluation time.
 */

// Lazy imports — resolved at call time, not module load time
let _useUserStore: typeof import('./useUserStore').useUserStore | null = null;
let _useMessagesStore: typeof import('./useMessagesStore').useMessagesStore | null = null;

function getUserStore() {
  if (!_useUserStore) {
    _useUserStore = require('./useUserStore').useUserStore;
  }
  return _useUserStore!;
}

function getMessagesStore() {
  if (!_useMessagesStore) {
    _useMessagesStore = require('./useMessagesStore').useMessagesStore;
  }
  return _useMessagesStore!;
}

/** Get the current user's ID */
export function getCurrentUserId(): string {
  return getUserStore().getState().currentUser?.id ?? '';
}

/** Get a user by ID */
export function getUserById(userId: string) {
  return getUserStore().getState().getUserById(userId);
}

/** Get a user's display name by ID */
export function getSenderName(userId: string): string {
  const user = getUserById(userId);
  return user?.name ?? 'Unknown';
}

/** Get the messages store (for cross-store access from groups, e.g. setState) */
export function getMessagesStoreRef() {
  return getMessagesStore();
}
