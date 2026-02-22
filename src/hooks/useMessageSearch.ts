import { useState, useMemo, useCallback } from 'react';
import type { Message } from '../types';

/**
 * Client-side message search hook.
 *
 * Filters an already-loaded array of messages by content, returning a Set of
 * matching message IDs for O(1) lookup during render. This provides instant
 * search results without hitting the repository.
 */
export function useMessageSearch(messages: Message[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const matchingMessageIds = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const ids = new Set<string>();
    for (const msg of messages) {
      if (msg.type === 'text' && msg.content.toLowerCase().includes(q)) {
        ids.add(msg.id);
      }
    }
    return ids;
  }, [messages, searchQuery]);

  const matchCount = matchingMessageIds.size;

  const openSearch = useCallback(() => {
    setIsSearching(true);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    isSearching,
    openSearch,
    clearSearch,
    matchingMessageIds,
    matchCount,
  };
}
