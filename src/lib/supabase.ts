import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../config/env';
import type { Database } from './database.types';

export const supabase = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Required for React Native (no browser URL bar)
  },
});
