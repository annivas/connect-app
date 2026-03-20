import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { getUserById } from '../../stores/helpers';
import { useShallow } from 'zustand/react/shallow';
import type { Traveler } from '../../types';

interface Props {
  groupId: string;
  selected: Traveler[];
  onChange: (travelers: Traveler[]) => void;
}

export function TravelerPicker({ groupId, selected, onChange }: Props) {
  const group = useGroupsStore(useShallow((s) => s.getGroupById(groupId)));
  const members = group?.members ?? [];
  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const memberList = useMemo(() => {
    return members.map((id) => {
      const user = getUserById(id);
      return { userId: id, name: user?.name ?? id };
    });
  }, [members]);

  const filtered = useMemo(() => {
    if (!search.trim()) return memberList;
    const q = search.toLowerCase();
    return memberList.filter((m) => m.name.toLowerCase().includes(q));
  }, [memberList, search]);

  const isSelected = (userId: string) => selected.some((t) => t.userId === userId);

  const toggle = (traveler: Traveler) => {
    Haptics.selectionAsync();
    if (isSelected(traveler.userId!)) {
      onChange(selected.filter((t) => t.userId !== traveler.userId));
    } else {
      onChange([...selected, traveler]);
    }
  };

  const removePill = (traveler: Traveler) => {
    Haptics.selectionAsync();
    onChange(selected.filter((t) =>
      traveler.userId ? t.userId !== traveler.userId : t.name !== traveler.name
    ));
  };

  const addCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    Haptics.selectionAsync();
    onChange([...selected, { name }]);
    setCustomInput('');
    setShowCustomInput(false);
    setSearch('');
  };

  const noMembersMatch = filtered.length === 0 && search.trim().length > 0;

  return (
    <View className="flex-1">
      {/* Selected pills */}
      {selected.length > 0 && (
        <View className="flex-row flex-wrap gap-2 px-4 pt-3 pb-1">
          {selected.map((t, i) => (
            <Pressable
              key={t.userId ?? t.name + i}
              onPress={() => removePill(t)}
              className="flex-row items-center gap-1 bg-background-tertiary border border-accent-primary rounded-full px-2 py-1"
            >
              <View className="w-4 h-4 rounded-full bg-accent-primary items-center justify-center">
                <Text className="text-white" style={{ fontSize: 8, fontWeight: '700' }}>
                  {t.name[0].toUpperCase()}
                </Text>
              </View>
              <Text className="text-accent-primary text-xs font-semibold">{t.name}</Text>
              <Text className="text-accent-primary" style={{ fontSize: 12, opacity: 0.6 }}>×</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Search */}
      <View className="flex-row items-center mx-4 mt-2 mb-1 bg-surface rounded-xl px-3 py-2 gap-2">
        <Ionicons name="search" size={16} color="#A8937F" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search or add name…"
          placeholderTextColor="#A8937F"
          className="flex-1 text-text-primary text-[14px]"
          returnKeyType="done"
        />
      </View>

      {/* Member list */}
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {!noMembersMatch && (
          <Text className="text-text-tertiary text-[10px] font-bold tracking-widest uppercase mt-3 mb-1">
            Group Members
          </Text>
        )}

        {filtered.map((m) => (
          <Pressable
            key={m.userId}
            onPress={() => toggle(m)}
            className="flex-row items-center py-2.5 border-b border-border-subtle"
          >
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: '#D4764E' }}
            >
              <Text className="text-white text-xs font-bold">{m.name[0].toUpperCase()}</Text>
            </View>
            <Text className="flex-1 text-text-primary text-[14px] font-medium">{m.name}</Text>
            <View
              className={`w-5 h-5 rounded-full border items-center justify-center ${
                isSelected(m.userId) ? 'bg-accent-primary border-accent-primary' : 'border-border bg-white'
              }`}
            >
              {isSelected(m.userId) && (
                <Text className="text-white" style={{ fontSize: 10, fontWeight: '900' }}>✓</Text>
              )}
            </View>
          </Pressable>
        ))}

        {/* Divider + custom name row */}
        <View className="border-t border-border mt-2 pt-2">
          {showCustomInput ? (
            <View className="flex-row items-center gap-2 py-2">
              <View className="w-8 h-8 rounded-full border border-dashed border-accent-secondary items-center justify-center">
                <Text className="text-accent-secondary text-lg">+</Text>
              </View>
              <TextInput
                value={customInput}
                onChangeText={setCustomInput}
                placeholder={noMembersMatch ? search : 'e.g. Parents, Sarah + John'}
                placeholderTextColor="#A8937F"
                className="flex-1 text-text-primary text-[14px]"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={addCustom}
              />
              <Pressable onPress={addCustom} hitSlop={8}>
                <Text className="text-accent-primary text-sm font-semibold">Add</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setShowCustomInput(true);
                if (noMembersMatch) setCustomInput(search);
              }}
              className="flex-row items-center py-2.5"
            >
              <View className="w-8 h-8 rounded-full border border-dashed border-accent-secondary items-center justify-center mr-3">
                <Text className="text-accent-secondary text-lg">+</Text>
              </View>
              <Text className="text-accent-secondary text-[14px] italic">
                {noMembersMatch ? `Add "${search}"` : 'Add custom name…'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
