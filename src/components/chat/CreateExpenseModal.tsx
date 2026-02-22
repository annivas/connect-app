import React, { useState } from 'react';
import { View, Text, TextInput, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useUserStore } from '../../stores/useUserStore';

interface Props {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
}

type Category = 'Food' | 'Transport' | 'Entertainment' | 'Shopping' | 'Other';

const CATEGORIES: { value: Category; icon: string }[] = [
  { value: 'Food', icon: '🍔' },
  { value: 'Transport', icon: '🚗' },
  { value: 'Entertainment', icon: '🎬' },
  { value: 'Shopping', icon: '🛍️' },
  { value: 'Other', icon: '📦' },
];

export function CreateExpenseModal({ visible, conversationId, onClose }: Props) {
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [paidByMe, setPaidByMe] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const currentUser = useUserStore((s) => s.currentUser);
  const conversation = useMessagesStore((s) => s.getConversationById(conversationId));
  const otherUserId = conversation?.participants.find((id) => id !== currentUser?.id);
  const getUserById = useUserStore((s) => s.getUserById);
  const otherUser = otherUserId ? getUserById(otherUserId) : null;

  const amount = parseFloat(amountText);
  const isAmountValid = !isNaN(amount) && amount > 0;
  const canSave = description.trim().length > 0 && isAmountValid && !isSaving;

  const reset = () => {
    setDescription('');
    setAmountText('');
    setCategory('Other');
    setPaidByMe(true);
    setIsSaving(false);
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!canSave || !currentUser || !otherUserId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      await useMessagesStore.getState().createLedgerEntry(conversationId, {
        description: description.trim(),
        amount,
        paidBy: paidByMe ? currentUser.id : otherUserId,
        splitBetween: [currentUser.id, otherUserId],
        category,
      });
      reset();
      onClose();
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <Pressable onPress={handleCancel} hitSlop={8}>
            <Text className="text-accent-primary text-[16px]">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary text-[17px] font-semibold">New Expense</Text>
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Text
                className={`text-[16px] font-semibold ${
                  canSave ? 'text-accent-primary' : 'text-text-tertiary'
                }`}
              >
                Save
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardDismissMode="interactive">
          {/* Description */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What was this for?"
            placeholderTextColor="#6B6B76"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
          />

          {/* Amount */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
            Amount
          </Text>
          <View className="flex-row items-center bg-surface rounded-xl px-4 py-3 mb-5">
            <Text className="text-text-secondary text-[18px] font-bold mr-1">$</Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0.00"
              placeholderTextColor="#6B6B76"
              keyboardType="decimal-pad"
              className="flex-1 text-text-primary text-[18px] font-semibold"
            />
          </View>

          {/* Category */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
            Category
          </Text>
          <View className="flex-row gap-2 mb-5 flex-wrap">
            {CATEGORIES.map((c) => {
              const isSelected = category === c.value;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCategory(c.value);
                  }}
                  className={`flex-row items-center px-3 py-2 rounded-xl border ${
                    isSelected
                      ? 'border-accent-primary bg-accent-primary/20'
                      : 'border-border bg-transparent'
                  }`}
                >
                  <Text className="text-[14px] mr-1.5">{c.icon}</Text>
                  <Text
                    className={`text-[13px] font-medium ${
                      isSelected ? 'text-accent-primary' : 'text-text-secondary'
                    }`}
                  >
                    {c.value}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Paid By */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
            Paid By
          </Text>
          <View className="flex-row gap-3 mb-5">
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setPaidByMe(true);
              }}
              className={`flex-1 py-3 rounded-xl items-center border-2 ${
                paidByMe ? 'border-accent-primary bg-accent-primary/20' : 'border-border bg-transparent'
              }`}
            >
              <Text
                className={`text-[14px] font-semibold ${
                  paidByMe ? 'text-accent-primary' : 'text-text-secondary'
                }`}
              >
                You
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setPaidByMe(false);
              }}
              className={`flex-1 py-3 rounded-xl items-center border-2 ${
                !paidByMe ? 'border-accent-primary bg-accent-primary/20' : 'border-border bg-transparent'
              }`}
            >
              <Text
                className={`text-[14px] font-semibold ${
                  !paidByMe ? 'text-accent-primary' : 'text-text-secondary'
                }`}
              >
                {otherUser?.name ?? 'Other'}
              </Text>
            </Pressable>
          </View>

          {/* Split Info */}
          <View className="bg-surface rounded-xl px-4 py-3 mb-5">
            <Text className="text-text-secondary text-[13px]">
              Split equally between you and {otherUser?.name ?? 'the other participant'}
            </Text>
            {isAmountValid && (
              <Text className="text-text-primary text-[14px] font-semibold mt-1">
                ${(amount / 2).toFixed(2)} each
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
