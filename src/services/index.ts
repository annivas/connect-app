import { config } from '../config/env';
import {
  IMessagesRepository,
  IGroupsRepository,
  IUserRepository,
  ICollectionsRepository,
} from './types';
import { mockMessagesRepository } from './mock/messagesRepository';
import { mockGroupsRepository } from './mock/groupsRepository';
import { mockUserRepository } from './mock/userRepository';
import { mockCollectionsRepository } from './mock/collectionsRepository';

function createMessagesRepository(): IMessagesRepository {
  if (config.useMocks) {
    return mockMessagesRepository;
  }
  // Supabase implementation will be added in Phase 3
  return mockMessagesRepository;
}

function createGroupsRepository(): IGroupsRepository {
  if (config.useMocks) {
    return mockGroupsRepository;
  }
  return mockGroupsRepository;
}

function createUserRepository(): IUserRepository {
  if (config.useMocks) {
    return mockUserRepository;
  }
  return mockUserRepository;
}

function createCollectionsRepository(): ICollectionsRepository {
  if (config.useMocks) {
    return mockCollectionsRepository;
  }
  return mockCollectionsRepository;
}

export const messagesRepository = createMessagesRepository();
export const groupsRepository = createGroupsRepository();
export const userRepository = createUserRepository();
export const collectionsRepository = createCollectionsRepository();
