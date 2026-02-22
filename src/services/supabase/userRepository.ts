import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { IUserRepository } from '../types';
import { adaptProfile } from './adapters';

export const supabaseUserRepository: IUserRepository = {
  async getCurrentUser(userId: string): Promise<User> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error(`Failed to fetch user: ${error.message}`);
    return adaptProfile(data);
  },

  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (error) throw new Error(`Failed to fetch users: ${error.message}`);
    return data.map(adaptProfile);
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    // Explicit camelCase → snake_case mapping (no generic converter)
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.statusMessage !== undefined) dbUpdates.status_message = updates.statusMessage;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return adaptProfile(data);
  },
};
