import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { config } from '../config/env';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    username: string,
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    // In mock mode, skip Supabase auth entirely and create a fake session
    if (config.useMocks) {
      set({
        session: { user: { id: 'mock-user' } } as Session,
        isInitialized: true,
      });
      return;
    }

    try {
      // Restore existing session from AsyncStorage
      const {
        data: { session },
      } = await supabase.auth.getSession();
      set({ session, isInitialized: true });

      // Listen for auth state changes (sign-in, sign-out, token refresh)
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session });
      });
    } catch {
      // If session restore fails, continue as unauthenticated
      set({ isInitialized: true });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      set({ isLoading: false });

      if (error) {
        return { error: error.message };
      }
      return {};
    } catch {
      set({ isLoading: false });
      return { error: 'An unexpected error occurred' };
    }
  },

  signUp: async (email, password, name, username) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, username }, // Picked up by handle_new_user() trigger
        },
      });
      set({ isLoading: false });

      if (error) {
        return { error: error.message };
      }
      return {};
    } catch {
      set({ isLoading: false });
      return { error: 'An unexpected error occurred' };
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
    } finally {
      set({ session: null, isLoading: false });
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      set({ isLoading: false });

      if (error) {
        return { error: error.message };
      }
      return {};
    } catch {
      set({ isLoading: false });
      return { error: 'An unexpected error occurred' };
    }
  },
}));
