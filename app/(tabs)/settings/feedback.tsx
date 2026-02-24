import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { useToastStore } from '../../../src/stores/useToastStore';

const FEEDBACK_TYPES = [
  { key: 'bug', label: 'Bug Report', icon: 'bug-outline' as const },
  { key: 'feature', label: 'Feature Request', icon: 'bulb-outline' as const },
  { key: 'general', label: 'General', icon: 'chatbubble-outline' as const },
];

export default function FeedbackScreen() {
  const router = useRouter();
  const [feedbackType, setFeedbackType] = useState('general');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const canSubmit = message.trim().length > 10;

  const handleSubmit = async () => {
    if (!canSubmit || isSending) return;
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simulate sending feedback
    await new Promise((resolve) => setTimeout(resolve, 1200));

    useToastStore.getState().show({
      message: 'Thanks for your feedback!',
      type: 'success',
    });
    setIsSending(false);
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">
          Send Feedback
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Feedback type */}
        <Text className="text-text-tertiary text-xs font-semibold px-4 pt-6 pb-3 uppercase tracking-wider">
          Type
        </Text>
        <View className="flex-row gap-2 px-4 mb-4">
          {FEEDBACK_TYPES.map((t) => {
            const isSelected = feedbackType === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFeedbackType(t.key);
                }}
                className={`flex-1 items-center py-3 rounded-2xl border ${
                  isSelected
                    ? 'bg-accent-primary/20 border-accent-primary'
                    : 'bg-surface border-border'
                }`}
              >
                <Ionicons
                  name={t.icon}
                  size={20}
                  color={isSelected ? '#D4764E' : '#7A6355'}
                />
                <Text
                  className={`text-xs mt-1 font-medium ${
                    isSelected ? 'text-accent-primary' : 'text-text-secondary'
                  }`}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Message */}
        <Text className="text-text-tertiary text-xs font-semibold px-4 pb-3 uppercase tracking-wider">
          Message
        </Text>
        <View className="mx-4 mb-4">
          <TextInput
            className="bg-surface rounded-2xl px-4 py-3 text-text-primary text-[15px]"
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us what's on your mind..."
            placeholderTextColor="#A8937F"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            style={{ minHeight: 140 }}
          />
        </View>

        {!canSubmit && message.length > 0 && (
          <Text className="text-text-tertiary text-xs px-4 mb-4">
            Please write at least 10 characters.
          </Text>
        )}

        {/* Submit */}
        <View className="px-4">
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || isSending}
            className={`rounded-2xl py-4 items-center ${
              canSubmit && !isSending ? 'bg-accent-primary' : 'bg-surface'
            }`}
          >
            <Text
              className={`font-semibold text-[15px] ${
                canSubmit && !isSending ? 'text-white' : 'text-text-tertiary'
              }`}
            >
              {isSending ? 'Sending...' : 'Submit Feedback'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
