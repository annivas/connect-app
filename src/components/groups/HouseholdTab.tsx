import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HouseholdData } from '../../types';
import { ChoreRotation } from './ChoreRotation';
import { ShoppingList } from './ShoppingList';
import { BillTracker } from './BillTracker';

type HouseholdSection = 'chores' | 'shopping' | 'bills';

interface Props {
  data: HouseholdData;
  getUserName: (id: string) => string;
  getUserAvatar: (id: string) => string;
  currentUserId: string;
  onToggleChore: (choreId: string) => void;
  onToggleShoppingItem: (itemId: string) => void;
  onAddShoppingItem: (name: string, category?: string) => void;
  onDeleteShoppingItem: (itemId: string) => void;
  onToggleBillPaid: (billId: string) => void;
}

const SECTIONS: { key: HouseholdSection; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'chores', label: 'Chores', icon: 'refresh-outline' },
  { key: 'shopping', label: 'Shopping', icon: 'cart-outline' },
  { key: 'bills', label: 'Bills', icon: 'receipt-outline' },
];

export function HouseholdTab({
  data,
  getUserName,
  getUserAvatar,
  currentUserId,
  onToggleChore,
  onToggleShoppingItem,
  onAddShoppingItem,
  onDeleteShoppingItem,
  onToggleBillPaid,
}: Props) {
  const [activeSection, setActiveSection] = useState<HouseholdSection>('chores');

  return (
    <View className="flex-1">
      {/* Section tabs */}
      <View className="flex-row px-4 pt-3 pb-2 gap-2">
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.key;
          return (
            <Pressable
              key={section.key}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveSection(section.key);
              }}
              className="flex-1"
            >
              <View
                className={`flex-row items-center justify-center rounded-xl py-2.5 ${
                  isActive ? 'bg-accent-primary' : 'bg-surface'
                }`}
              >
                <Ionicons
                  name={section.icon}
                  size={16}
                  color={isActive ? '#FFFFFF' : '#7A6355'}
                />
                <Text
                  className={`text-xs font-medium ml-1.5 ${
                    isActive ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {section.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Section content */}
      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {activeSection === 'chores' && (
          <ChoreRotation
            chores={data.chores}
            getUserName={getUserName}
            getUserAvatar={getUserAvatar}
            onToggleChore={onToggleChore}
          />
        )}
        {activeSection === 'shopping' && (
          <ShoppingList
            items={data.shoppingList}
            getUserName={getUserName}
            onToggleItem={onToggleShoppingItem}
            onAddItem={onAddShoppingItem}
            onDeleteItem={onDeleteShoppingItem}
          />
        )}
        {activeSection === 'bills' && (
          <BillTracker
            bills={data.recurringBills}
            getUserName={getUserName}
            onTogglePaid={onToggleBillPaid}
            currentUserId={currentUserId}
          />
        )}
      </ScrollView>
    </View>
  );
}
