import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
}

export function AuthInput({ label, icon, error, secureTextEntry, ...rest }: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const borderColor = error
    ? 'border-status-error'
    : isFocused
      ? 'border-accent-primary'
      : 'border-border';

  return (
    <View className="mb-4">
      <Text className="text-text-secondary text-sm font-medium mb-1.5 ml-1">{label}</Text>
      <View
        className={`flex-row items-center bg-surface rounded-xl border ${borderColor} px-4 h-[52px]`}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={isFocused ? '#6366F1' : '#6B6B76'}
            style={{ marginRight: 10 }}
          />
        )}
        <TextInput
          className="flex-1 text-text-primary text-[15px]"
          placeholderTextColor="#6B6B76"
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)} hitSlop={8}>
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#6B6B76"
            />
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="text-status-error text-xs mt-1 ml-1">{error}</Text>
      )}
    </View>
  );
}
