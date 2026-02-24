import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '../../stores/useUserStore';
import { MemberAssignmentPicker } from '../groups/MemberAssignmentPicker';
import type { LedgerEntry, User } from '../../types';

interface Props {
  visible: boolean;
  conversationId?: string;
  onClose: () => void;
  onSave?: (entry: Omit<LedgerEntry, 'id'>) => void;
  members?: User[];
}

type Category = 'Food' | 'Transport' | 'Entertainment' | 'Shopping' | 'Other';

const CATEGORIES: { value: Category; icon: string }[] = [
  { value: 'Food', icon: '🍔' },
  { value: 'Transport', icon: '🚗' },
  { value: 'Entertainment', icon: '🎬' },
  { value: 'Shopping', icon: '🛍️' },
  { value: 'Other', icon: '📦' },
];

export function CreateExpenseModal({ visible, onClose, onSave, members }: Props) {
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [paidByMe, setPaidByMe] = useState(true);
  const [paidByUserId, setPaidByUserId] = useState<string | null>(null);
  const [splitBetweenIds, setSplitBetweenIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const currentUser = useUserStore((s) => s.currentUser);
  const isGroupMode = members && members.length > 2;

  // 1-on-1 mode: find the other user
  const otherUser = !isGroupMode && members && members.length === 2
    ? members.find((m) => m.id !== currentUser?.id) ?? null
    : null;

  // Auto-select all members for split when opening in group mode
  useEffect(() => {
    if (visible && isGroupMode && splitBetweenIds.length === 0) {
      setSplitBetweenIds(members!.map((m) => m.id));
    }
  }, [visible, isGroupMode]);

  const amount = parseFloat(amountText);
  const isAmountValid = !isNaN(amount) && amount > 0;
  const canSave = description.trim().length > 0 && isAmountValid && !isSaving
    && (isGroupMode ? splitBetweenIds.length > 0 : true);

  const reset = () => {
    setDescription('');
    setAmountText('');
    setCategory('Other');
    setPaidByMe(true);
    setPaidByUserId(null);
    setSplitBetweenIds([]);
    setIsSaving(false);
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!canSave || !currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    let paidBy: string;
    let splitBetween: string[];

    if (isGroupMode) {
      paidBy = paidByUserId ?? currentUser.id;
      splitBetween = splitBetweenIds;
    } else {
      const otherUserId = otherUser?.id ?? '';
      paidBy = paidByMe ? currentUser.id : otherUserId;
      splitBetween = [currentUser.id, otherUserId];
    }

    try {
      await onSave?.({
        description: description.trim(),
        amount,
        paidBy,
        splitBetween,
        category,
        date: new Date(),
        isSettled: false,
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
              <ActivityIndicator size="small" color="#D4764E" />
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
            placeholderTextColor="#A8937F"
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
              placeholderTextColor="#A8937F"
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
          {isGroupMode ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
              {members!.map((member) => {
                const isSelected = (paidByUserId ?? currentUser?.id) === member.id;
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPaidByUserId(member.id);
                    }}
                    className={`mr-2 px-4 py-2.5 rounded-xl border-2 ${
                      isSelected ? 'border-accent-primary bg-accent-primary/20' : 'border-border bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-[14px] font-semibold ${
                        isSelected ? 'text-accent-primary' : 'text-text-secondary'
                      }`}
                    >
                      {member.id === currentUser?.id ? 'You' : member.name.split(' ')[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
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
          )}

          {/* Split Between (group mode) / Split Info (1-on-1 mode) */}
          {isGroupMode ? (
            <MemberAssignmentPicker
              members={members!}
              selectedIds={splitBetweenIds}
              onToggle={(userId) =>
                setSplitBetweenIds((prev) =>
                  prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
                )
              }
              label="SPLIT BETWEEN"
            />
          ) : (
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
          )}

          {/* Group split summary */}
          {isGroupMode && isAmountValid && splitBetweenIds.length > 0 && (
            <View className="bg-surface rounded-xl px-4 py-3 mt-3 mb-5">
              <Text className="text-text-secondary text-[13px]">
                Split equally between {splitBetweenIds.length} {splitBetweenIds.length === 1 ? 'person' : 'people'}
              </Text>
              <Text className="text-text-primary text-[14px] font-semibold mt-1">
                ${(amount / splitBetweenIds.length).toFixed(2)} each
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
