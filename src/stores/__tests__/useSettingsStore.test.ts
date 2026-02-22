import { useSettingsStore } from '../useSettingsStore';

// Reset store before each test
beforeEach(() => {
  useSettingsStore.setState({
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
  });
});

describe('useSettingsStore', () => {
  describe('theme', () => {
    it('should default to light theme', () => {
      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('should update theme', () => {
      useSettingsStore.getState().setTheme('light');
      expect(useSettingsStore.getState().theme).toBe('light');
    });
  });

  describe('accentColor', () => {
    it('should default to terracotta', () => {
      expect(useSettingsStore.getState().accentColor).toBe('#D4764E');
    });

    it('should update accent color', () => {
      useSettingsStore.getState().setAccentColor('#C94F4F');
      expect(useSettingsStore.getState().accentColor).toBe('#C94F4F');
    });
  });

  describe('notifications', () => {
    it('should default all notifications to true', () => {
      const { notifications } = useSettingsStore.getState();
      expect(notifications.push).toBe(true);
      expect(notifications.sounds).toBe(true);
      expect(notifications.badges).toBe(true);
      expect(notifications.messagePreview).toBe(true);
      expect(notifications.groupNotifications).toBe(true);
      expect(notifications.reminderAlerts).toBe(true);
    });

    it('should update individual notification setting', () => {
      useSettingsStore.getState().updateNotification('push', false);
      expect(useSettingsStore.getState().notifications.push).toBe(false);

      // Other settings should remain unchanged
      expect(useSettingsStore.getState().notifications.sounds).toBe(true);
    });
  });
});
