import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../../src/components/ui/Avatar';
import { IconButton } from '../../../src/components/ui/IconButton';
import { useUserStore } from '../../../src/stores/useUserStore';

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center py-3.5 px-4">
      <View className="w-9 h-9 bg-surface-elevated rounded-full items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color="#A0A0AB" />
      </View>
      <View className="flex-1">
        <Text className="text-text-tertiary text-xs">{label}</Text>
        <Text className="text-text-primary text-[15px] mt-0.5">{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const currentUser = useUserStore((s) => s.currentUser);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">
          Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & Name */}
        <View className="items-center pt-8 pb-6">
          <Avatar
            uri={currentUser.avatar}
            size="xl"
            status={currentUser.status}
            showStatus
          />
          <Text className="text-text-primary text-2xl font-bold mt-4">
            {currentUser.name}
          </Text>
          <Text className="text-text-secondary text-sm mt-1">
            {currentUser.username}
          </Text>
          {currentUser.statusMessage && (
            <View className="flex-row items-center mt-2 bg-surface px-4 py-2 rounded-full">
              <Text className="text-text-tertiary text-sm">
                {currentUser.statusMessage}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View className="bg-surface mx-4 rounded-2xl overflow-hidden">
          <InfoRow
            icon="at-outline"
            label="Username"
            value={currentUser.username}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={currentUser.email ?? 'Not set'}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={currentUser.phone ?? 'Not set'}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <InfoRow
            icon="ellipse"
            label="Status"
            value={currentUser.status.charAt(0).toUpperCase() + currentUser.status.slice(1)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
