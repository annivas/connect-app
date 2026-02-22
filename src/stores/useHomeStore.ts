import { create } from 'zustand';
import { Collection } from '../types';
import { collectionsRepository } from '../services';

interface HomeState {
  collections: Collection[];
  isLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
}

export const useHomeStore = create<HomeState>((set) => ({
  collections: [],
  isLoading: false,
  error: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      const collections = await collectionsRepository.getCollections();
      set({ collections, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load collections',
        isLoading: false,
      });
    }
  },
}));
