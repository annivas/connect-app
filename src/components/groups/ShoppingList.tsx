import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ShoppingItem } from '../../types';

interface Props {
  items: ShoppingItem[];
  getUserName: (id: string) => string;
  onToggleItem: (itemId: string) => void;
  onAddItem: (name: string, category?: string) => void;
  onDeleteItem: (itemId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Dairy: '#5B8EC9',
  Bakery: '#D4964E',
  Meat: '#C94F4F',
  Produce: '#2D9F6F',
  Cleaning: '#8B6F5A',
  default: '#A8937F',
};

export function ShoppingList({ items, getUserName, onToggleItem, onAddItem, onDeleteItem }: Props) {
  const [newItemText, setNewItemText] = useState('');
  const unchecked = items.filter((i) => !i.isChecked);
  const checked = items.filter((i) => i.isChecked);

  const handleAdd = () => {
    if (!newItemText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddItem(newItemText.trim());
    setNewItemText('');
  };

  return (
    <View>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="cart-outline" size={18} color="#D4764E" />
          <Text className="text-text-primary font-bold text-base ml-2">Shopping List</Text>
        </View>
        <Text className="text-text-tertiary text-xs">
          {unchecked.length} item{unchecked.length !== 1 ? 's' : ''} left
        </Text>
      </View>

      {/* Add item input */}
      <View className="flex-row items-center bg-surface rounded-2xl px-3.5 py-2.5 mb-3">
        <Ionicons name="add-circle-outline" size={20} color="#D4764E" />
        <TextInput
          value={newItemText}
          onChangeText={setNewItemText}
          placeholder="Add an item..."
          placeholderTextColor="#A8937F"
          className="flex-1 text-text-primary text-sm ml-2"
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        {newItemText.length > 0 && (
          <Pressable onPress={handleAdd}>
            <Ionicons name="send" size={18} color="#D4764E" />
          </Pressable>
        )}
      </View>

      {/* Unchecked items */}
      {unchecked.map((item) => {
        const catColor = CATEGORY_COLORS[item.category || 'default'] || CATEGORY_COLORS.default;
        return (
          <Pressable
            key={item.id}
            onPress={() => {
              Haptics.selectionAsync();
              onToggleItem(item.id);
            }}
            className="active:opacity-80"
          >
            <View className="flex-row items-center bg-surface rounded-xl p-3 mb-1.5">
              <View className="w-5 h-5 rounded border-2 border-border mr-3" />
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-text-primary text-sm">{item.name}</Text>
                  {item.quantity && (
                    <Text className="text-text-tertiary text-xs ml-1.5">x{item.quantity}</Text>
                  )}
                </View>
                {item.category && (
                  <View className="flex-row items-center mt-0.5">
                    <View
                      className="w-1.5 h-1.5 rounded-full mr-1"
                      style={{ backgroundColor: catColor }}
                    />
                    <Text className="text-text-tertiary text-[10px]">{item.category}</Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDeleteItem(item.id);
                }}
                hitSlop={8}
              >
                <Ionicons name="close-circle-outline" size={16} color="#A8937F" />
              </Pressable>
            </View>
          </Pressable>
        );
      })}

      {/* Checked items */}
      {checked.length > 0 && (
        <View className="mt-2">
          <Text className="text-text-tertiary text-xs font-medium mb-1.5">
            Checked ({checked.length})
          </Text>
          {checked.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                Haptics.selectionAsync();
                onToggleItem(item.id);
              }}
              className="active:opacity-80"
            >
              <View className="flex-row items-center py-2 px-3">
                <View className="w-5 h-5 rounded bg-status-success items-center justify-center mr-3">
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
                <Text className="text-text-tertiary text-sm line-through flex-1">{item.name}</Text>
                {item.checkedBy && (
                  <Text className="text-text-tertiary text-[10px]">
                    {getUserName(item.checkedBy).split(' ')[0]}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
