import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function AuthButton({
  title,
  onPress,
  isLoading = false,
  variant = 'primary',
  disabled = false,
}: AuthButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      onPress={() => {
        if (!isDisabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      className={`h-[52px] rounded-xl items-center justify-center ${
        isPrimary
          ? isDisabled
            ? 'bg-accent-primary/50'
            : 'bg-accent-primary'
          : 'bg-surface border border-border'
      }`}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : '#A0A0AB'} size="small" />
      ) : (
        <Text
          className={`text-[15px] font-semibold ${
            isPrimary ? 'text-white' : 'text-text-secondary'
          }`}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
