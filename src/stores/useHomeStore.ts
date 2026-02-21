import { create } from 'zustand';
import { Collection } from '../types';
import { MOCK_COLLECTIONS } from '../mocks/collections';

interface HomeState {
  collections: Collection[];
}

export const useHomeStore = create<HomeState>(() => ({
  collections: MOCK_COLLECTIONS,
}));
