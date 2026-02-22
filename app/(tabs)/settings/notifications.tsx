import React from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { useSettingsStore } from '../../../src/stores/useSettingsStore';

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onToggle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <View className="flex-row items-center py-3.5 px-4">
      <View className="w-9 h-9 bg-surface-elevated rounded-full items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color="#7A6355" />
      </View>
      <View className="flex-1">
        <Text className="text-text-primary text-[15px]">{title}</Text>
        {subtitle && (
          <Text className="text-text-tertiary text-xs mt-0.5">{subtitle}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={(val) => { Haptics.selectionAsync(); onToggle(val); }}
        trackColor={{ false: '#FFE8D6', true: '#D4764E' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useSettingsStore((s) => s.notifications);
  const updateNotification = useSettingsStore((s) => s.updateNotification);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">
          Notifications
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* General */}
        <Text className="text-text-tertiary text-xs font-semibold px-4 pt-6 pb-2 uppercase tracking-wider">
          General
        </Text>
        <View className="bg-surface mx-4 rounded-2xl overflow-hidden">
          <ToggleRow
            icon="notifications-outline"
            title="Push Notifications"
            subtitle="Receive push notifications"
            value={notifications.push}
            onToggle={(val) => updateNotification('push', val)}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <ToggleRow
            icon="volume-high-outline"
            title="Sounds"
            subtitle="Play notification sounds"
            value={notifications.sounds}
            onToggle={(val) => updateNotification('sounds', val)}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <ToggleRow
            icon="ellipse"
            title="Badge Count"
            subtitle="Show unread count on app icon"
            value={notifications.badges}
            onToggle={(val) => updateNotification('badges', val)}
          />
        </View>

        {/* Content */}
        <Text className="text-text-tertiary text-xs font-semibold px-4 pt-6 pb-2 uppercase tracking-wider">
          Content
        </Text>
        <View className="bg-surface mx-4 rounded-2xl overflow-hidden">
          <ToggleRow
            icon="eye-outline"
            title="Message Preview"
            subtitle="Show message content in notifications"
            value={notifications.messagePreview}
            onToggle={(val) => updateNotification('messagePreview', val)}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <ToggleRow
            icon="people-outline"
            title="Group Notifications"
            subtitle="Get notified for group messages"
            value={notifications.groupNotifications}
            onToggle={(val) => updateNotification('groupNotifications', val)}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <ToggleRow
            icon="alarm-outline"
            title="Reminder Alerts"
            subtitle="Get notified for upcoming reminders"
            value={notifications.reminderAlerts}
            onToggle={(val) => updateNotification('reminderAlerts', val)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
