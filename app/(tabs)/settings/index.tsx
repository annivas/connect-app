import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Card } from '../../../src/components/ui/Card';
import { useUserStore } from '../../../src/stores/useUserStore';
import { useAuthStore } from '../../../src/stores/useAuthStore';

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      className="flex-row items-center py-3.5 px-4 active:bg-surface-hover"
    >
      <View className="w-9 h-9 bg-surface-elevated rounded-full items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color={disabled ? '#6B6B76' : '#A0A0AB'} />
      </View>
      <View className="flex-1">
        <Text className={`text-[15px] ${disabled ? 'text-text-tertiary' : 'text-text-primary'}`}>
          {title}
        </Text>
        {subtitle && (
          <Text className="text-text-tertiary text-xs mt-0.5">{subtitle}</Text>
        )}
      </View>
      {!disabled && <Ionicons name="chevron-forward" size={18} color="#6B6B76" />}
    </Pressable>
  );
}

function Divider() {
  return <View className="h-px bg-border-subtle mx-4" />;
}

export default function SettingsScreen() {
  const router = useRouter();
  const currentUser = useUserStore((s) => s.currentUser)!;

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await useAuthStore.getState().signOut();
          },
        },
      ],
    );
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
            disabled
          />
          <Divider />
          <SettingItem
            icon="cloud-outline"
            title="Storage & Data"
            subtitle="Manage cache and downloads"
            disabled
          />
        </View>

        {/* Support section */}
        <View className="bg-surface mx-4 rounded-2xl overflow-hidden mb-4">
          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
            disabled
          />
          <Divider />
          <SettingItem
            icon="chatbubble-ellipses-outline"
            title="Send Feedback"
            disabled
          />
          <Divider />
          <SettingItem
            icon="information-circle-outline"
            title="About Connect"
            subtitle="v1.0.0"
            onPress={() => router.push('/(tabs)/settings/about')}
          />
        </View>

        {/* Sign Out */}
        <View className="px-4 mt-6">
          <Pressable
            onPress={handleSignOut}
            className="bg-surface rounded-2xl py-4 items-center active:bg-surface-hover"
          >
            <Text className="text-status-error font-semibold text-[15px]">
              Sign Out
            </Text>
          </Pressable>
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
