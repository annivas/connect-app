import { MOCK_COLLECTIONS } from '../../mocks/collections';
import { ICollectionsRepository } from '../types';

export const mockCollectionsRepository: ICollectionsRepository = {
  async getCollections() {
    return [...MOCK_COLLECTIONS];
  },
};
