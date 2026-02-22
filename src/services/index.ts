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
import { supabaseMessagesRepository } from './supabase/messagesRepository';
import { supabaseGroupsRepository } from './supabase/groupsRepository';
import { supabaseUserRepository } from './supabase/userRepository';
import { supabaseCollectionsRepository } from './supabase/collectionsRepository';

function createMessagesRepository(): IMessagesRepository {
  return config.useMocks ? mockMessagesRepository : supabaseMessagesRepository;
}

function createGroupsRepository(): IGroupsRepository {
  return config.useMocks ? mockGroupsRepository : supabaseGroupsRepository;
}

function createUserRepository(): IUserRepository {
  return config.useMocks ? mockUserRepository : supabaseUserRepository;
}

function createCollectionsRepository(): ICollectionsRepository {
  return config.useMocks ? mockCollectionsRepository : supabaseCollectionsRepository;
}

export const messagesRepository = createMessagesRepository();
export const groupsRepository = createGroupsRepository();
export const userRepository = createUserRepository();
export const collectionsRepository = createCollectionsRepository();
