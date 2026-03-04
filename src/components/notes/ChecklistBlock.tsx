import React, { useRef } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  content: string;
  checked: boolean;
  onChangeText: (text: string) => void;
  onToggleCheck: () => void;
  onSubmitEditing: () => void;
  onBackspace: () => void;
  autoFocus?: boolean;
}

export function ChecklistBlock({
  content,
  checked,
  onChangeText,
  onToggleCheck,
  onSubmitEditing,
  onBackspace,
  autoFocus,
}: Props) {
  const inputRef = useRef<TextInput>(null);

  return (
    <View className="flex-row items-start px-4 py-1">
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onToggleCheck();
        }}
        className="mt-0.5 mr-3"
        hitSlop={8}
      >
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={22}
          color={checked ? '#2D9F6F' : '#A8937F'}
        />
      </Pressable>
      <TextInput
        ref={inputRef}
        value={content}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace' && content === '') {
            onBackspace();
          }
        }}
        placeholder="To-do"
        placeholderTextColor="#A8937F"
        autoFocus={autoFocus}
        multiline
        blurOnSubmit
        className={`flex-1 text-[15px] leading-[22px] py-0 ${
          checked ? 'text-text-tertiary line-through' : 'text-text-primary'
        }`}
        style={{ textDecorationLine: checked ? 'line-through' : 'none' }}
      />
    </View>
  );
}
