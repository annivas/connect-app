import React from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ContactInsightsSheet } from '../../../src/components/chat/ContactInsightsSheet';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import { CURRENT_USER_ID } from '../../../src/mocks/users';

export default function ContactInsightsScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const conversations = useMessagesStore((s) => s.conversations);
  const messages = useMessagesStore((s) => s.messages);
  const users = useUserStore((s) => s.users);

  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) return null;

  const otherUserId = conversation.participants.find((p) => p !== CURRENT_USER_ID);
  const user = users.find((u) => u.id === otherUserId);
  if (!user) return null;

  const convMessages = messages.filter((m) => m.conversationId === conversationId);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border-subtle">
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color="#2D1F14" />
        </Pressable>
        <View className="flex-1 items-center">
          <Ionicons name="analytics-outline" size={20} color="#D4764E" />
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ContactInsightsSheet
        user={user}
        conversation={conversation}
        messages={convMessages}
        currentUserId={CURRENT_USER_ID}
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}
