import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettings {
  push: boolean;
  sounds: boolean;
  badges: boolean;
  messagePreview: boolean;
  groupNotifications: boolean;
  reminderAlerts: boolean;
}

interface PrivacySettings {
  showOnlineStatus: boolean;
  readReceipts: boolean;
  typingIndicators: boolean;
}

interface SettingsState {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;

  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setAccentColor: (color: string) => void;
  updateNotification: (key: keyof NotificationSettings, value: boolean) => void;
  updatePrivacy: (key: keyof PrivacySettings, value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      accentColor: '#D4764E',
      notifications: {
        push: true,
        sounds: true,
        badges: true,
        messagePreview: true,
        groupNotifications: true,
        reminderAlerts: true,
      },
      privacy: {
        showOnlineStatus: true,
        readReceipts: true,
        typingIndicators: true,
      },

      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      updateNotification: (key, value) =>
        set((state) => ({
          notifications: { ...state.notifications, [key]: value },
        })),
      updatePrivacy: (key, value) =>
        set((state) => ({
          privacy: { ...state.privacy, [key]: value },
        })),
    }),
    {
      name: 'connect-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
