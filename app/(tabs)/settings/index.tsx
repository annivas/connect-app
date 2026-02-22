import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Card } from '../../../src/components/ui/Card';
import { useUserStore } from '../../../src/stores/useUserStore';

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3.5 px-4 active:bg-surface-hover"
    >
      <View className="w-9 h-9 bg-surface-elevated rounded-full items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color="#A0A0AB" />
      </View>
      <View className="flex-1">
        <Text className="text-text-primary text-[15px]">{title}</Text>
        {subtitle && (
          <Text className="text-text-tertiary text-xs mt-0.5">{subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#6B6B76" />
    </Pressable>
  );
}

function Divider() {
  return <View className="h-px bg-border-subtle mx-4" />;
}

export default function SettingsScreen() {
  const router = useRouter();
  const currentUser = useUserStore((s) => s.currentUser)!;

  const showComingSoon = (feature: string) => {
    Alert.alert(feature, 'This feature is coming soon!', [{ text: 'OK' }]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-text-primary text-3xl font-bold px-4 pt-2 pb-6">
          Settings
        </Text>

        {/* Profile card */}
        <Card className="mx-4 mb-6">
          <Pressable
            className="flex-row items-center"
            onPress={() => router.push('/(tabs)/settings/profile')}
          >
            <Avatar
              uri={currentUser.avatar}
              size="xl"
              status={currentUser.status}
              showStatus
            />
            <View className="ml-4 flex-1">
              <Text className="text-text-primary text-xl font-bold">
                {currentUser.name}
              </Text>
              <Text className="text-text-secondary text-sm">
                {currentUser.username}
              </Text>
              {currentUser.statusMessage && (
                <Text className="text-text-tertiary text-sm mt-1">
                  {currentUser.statusMessage}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B6B76" />
          </Pressable>
        </Card>

        {/* Account section */}
        <View className="bg-surface mx-4 rounded-2xl overflow-hidden mb-4">
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Push, sounds, badges"
            onPress={() => router.push('/(tabs)/settings/notifications')}
          />
          <Divider />
          <SettingItem
            icon="moon-outline"
            title="Appearance"
            subtitle="Dark mode"
            onPress={() => router.push('/(tabs)/settings/appearance')}
          />
          <Divider />
          <SettingItem
            icon="lock-closed-outline"
            title="Privacy"
            subtitle="Online status, read receipts"
            onPress={() => showComingSoon('Privacy')}
          />
          <Divider />
          <SettingItem
            icon="cloud-outline"
            title="Storage & Data"
            subtitle="Manage cache and downloads"
            onPress={() => showComingSoon('Storage & Data')}
          />
        </View>

        {/* Support section */}
        <View className="bg-surface mx-4 rounded-2xl overflow-hidden mb-4">
          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() => showComingSoon('Help & Support')}
          />
          <Divider />
          <SettingItem
            icon="chatbubble-ellipses-outline"
            title="Send Feedback"
            onPress={() => showComingSoon('Send Feedback')}
          />
          <Divider />
          <SettingItem
            icon="information-circle-outline"
            title="About Connect"
            subtitle="v1.0.0"
            onPress={() => router.push('/(tabs)/settings/about')}
          />
        </View>

        {/* Footer */}
        <View className="px-4 mt-4 items-center">
          <Text className="text-text-tertiary text-xs">
            Connect v1.0.0 · Built with love
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
