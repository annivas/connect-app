import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RecurringBill } from '../../types';
import { format, isPast, isToday, differenceInDays } from 'date-fns';

interface Props {
  bills: RecurringBill[];
  getUserName: (id: string) => string;
  onTogglePaid: (billId: string) => void;
  currentUserId: string;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Housing: 'home-outline',
  Utilities: 'flash-outline',
  Entertainment: 'tv-outline',
  Household: 'basket-outline',
  default: 'receipt-outline',
};

function getDueLabel(date: Date): { text: string; color: string } {
  const daysUntil = differenceInDays(date, new Date());
  if (isPast(date) && !isToday(date)) return { text: 'Overdue!', color: '#C94F4F' };
  if (isToday(date)) return { text: 'Due today', color: '#D4964E' };
  if (daysUntil <= 3) return { text: `Due in ${daysUntil}d`, color: '#D4964E' };
  return { text: format(date, 'MMM d'), color: '#A8937F' };
}

export function BillTracker({ bills, getUserName, onTogglePaid, currentUserId }: Props) {
  const unpaid = bills.filter((b) => !b.isPaid);
  const paid = bills.filter((b) => b.isPaid);

  const totalMonthly = bills.reduce((sum, b) => sum + b.amount, 0);
  const yourShare = bills.reduce((sum, b) => sum + b.amount / b.splitBetween.length, 0);

  return (
    <View>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="receipt-outline" size={18} color="#D4764E" />
          <Text className="text-text-primary font-bold text-base ml-2">Bills</Text>
        </View>
      </View>

      {/* Summary card */}
      <View className="bg-surface rounded-2xl p-4 mb-3">
        <View className="flex-row justify-between">
          <View>
            <Text className="text-text-tertiary text-xs">Monthly total</Text>
            <Text className="text-text-primary text-xl font-bold">${totalMonthly.toFixed(2)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-text-tertiary text-xs">Your share</Text>
            <Text className="text-accent-primary text-xl font-bold">${yourShare.toFixed(2)}</Text>
          </View>
        </View>
        <View className="flex-row items-center mt-2">
          <View className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
            <View
              className="h-full bg-accent-primary rounded-full"
              style={{ width: `${bills.length > 0 ? (paid.length / bills.length) * 100 : 0}%` }}
            />
          </View>
          <Text className="text-text-tertiary text-[10px] ml-2">
            {paid.length}/{bills.length} paid
          </Text>
        </View>
      </View>

      {/* Unpaid bills */}
      {unpaid.map((bill) => {
        const due = getDueLabel(bill.dueDate);
        const icon = CATEGORY_ICONS[bill.category] || CATEGORY_ICONS.default;
        const perPerson = bill.amount / bill.splitBetween.length;

        return (
          <Pressable
            key={bill.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTogglePaid(bill.id);
            }}
            className="active:opacity-80"
          >
            <View className="flex-row items-center bg-surface rounded-2xl p-3.5 mb-2">
              <View className="w-10 h-10 rounded-full bg-background-tertiary items-center justify-center mr-3">
                <Ionicons name={icon} size={20} color="#8B6F5A" />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary text-sm font-medium">{bill.name}</Text>
                <View className="flex-row items-center mt-0.5">
                  <Text className="text-xs font-medium" style={{ color: due.color }}>{due.text}</Text>
                  <Text className="text-text-tertiary text-xs mx-1">·</Text>
                  <Text className="text-text-tertiary text-xs">
                    ${perPerson.toFixed(2)}/person
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-text-primary text-sm font-bold">${bill.amount.toFixed(2)}</Text>
                {bill.paidBy && (
                  <Text className="text-text-tertiary text-[10px] mt-0.5">
                    {bill.paidBy === currentUserId ? 'You pay' : getUserName(bill.paidBy).split(' ')[0] + ' pays'}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        );
      })}

      {/* Paid bills */}
      {paid.length > 0 && (
        <View className="mt-1">
          <Text className="text-text-tertiary text-xs font-medium mb-1.5">Paid this month</Text>
          {paid.map((bill) => {
            const icon = CATEGORY_ICONS[bill.category] || CATEGORY_ICONS.default;
            return (
              <View key={bill.id} className="flex-row items-center py-2 px-1">
                <View className="w-7 h-7 rounded-full bg-status-success/10 items-center justify-center mr-2.5">
                  <Ionicons name={icon} size={14} color="#2D9F6F" />
                </View>
                <Text className="text-text-tertiary text-sm flex-1">{bill.name}</Text>
                <Ionicons name="checkmark-circle" size={16} color="#2D9F6F" />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
