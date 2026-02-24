import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import type { User } from '../../types';

interface Props {
  members: User[];
  selectedIds: string[];
  onToggle: (userId: string) => void;
  label?: string;
}

export function MemberAssignmentPicker({ members, selectedIds, onToggle, label }: Props) {
  return (
    <View className="mt-3">
      {label && (
        <Text className="text-text-secondary text-xs font-medium mb-2 px-1">{label}</Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
        {members.map((member) => {
          const isSelected = selectedIds.includes(member.id);
          return (
            <Pressable
              key={member.id}
              onPress={() => {
                Haptics.selectionAsync();
                onToggle(member.id);
              }}
              className="items-center mr-3 w-16"
            >
              <View className={`rounded-full ${isSelected ? 'border-2 border-accent-primary' : 'border-2 border-transparent'}`}>
                <Avatar uri={member.avatar} size="sm" />
              </View>
              <Text
                className={`text-[10px] mt-1 text-center ${
                  isSelected ? 'text-accent-primary font-semibold' : 'text-text-tertiary'
                }`}
                numberOfLines={1}
              >
                {member.name.split(' ')[0]}
              </Text>
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={14}
                color={isSelected ? '#D4764E' : '#A8937F'}
                style={{ marginTop: 2 }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
