import React from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import type { User } from '../../types';

interface Props {
  user: User | null;
  visible: boolean;
  onClose: () => void;
}

function StatusPill({ status }: { status: User['status'] }) {
  const colors: Record<User['status'], string> = {
    online: '#2D9F6F',
    away: '#D4964E',
    offline: '#A8937F',
  };

  const labels: Record<User['status'], string> = {
    online: 'Online',
    away: 'Away',
    offline: 'Offline',
  };

  return (
    <View className="flex-row items-center bg-surface-elevated rounded-full px-3 py-1.5 mt-2">
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[status] }}
      />
      <Text className="text-text-secondary text-sm ml-2">{labels[status]}</Text>
    </View>
  );
}

function ContactRow({ icon, value }: { icon: string; value: string }) {
  return (
    <View className="flex-row items-center py-3">
      <View className="w-9 h-9 rounded-full bg-surface-elevated items-center justify-center">
        <Ionicons name={icon as any} size={18} color="#A8937F" />
      </View>
      <Text className="text-text-primary text-[15px] ml-3">{value}</Text>
    </View>
  );
}

export function UserProfileSheet({ user, visible, onClose }: Props) {
  if (!user) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle">
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-accent-primary text-[15px]">Close</Text>
          </Pressable>
          <Text className="text-text-primary text-[17px] font-semibold">Profile</Text>
          <View className="w-12" />
        </View>

        {/* Profile card */}
        <View className="items-center pt-8 pb-6">
          <Avatar uri={user.avatar} size="xl" status={user.status} showStatus />
          <Text className="text-text-primary text-2xl font-bold mt-4">
            {user.name}
          </Text>
          <Text className="text-text-secondary text-[15px] mt-0.5">
            @{user.username}
          </Text>
          <StatusPill status={user.status} />
          {user.statusMessage && (
            <Text className="text-text-tertiary text-sm mt-2 italic px-8 text-center">
              "{user.statusMessage}"
            </Text>
          )}
        </View>

        {/* Contact info */}
        {(user.email || user.phone) && (
          <View className="mx-4 px-4 py-2 bg-surface rounded-2xl">
            {user.email && <ContactRow icon="mail-outline" value={user.email} />}
            {user.email && user.phone && <View className="h-px bg-border-subtle" />}
            {user.phone && <ContactRow icon="call-outline" value={user.phone} />}
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}
