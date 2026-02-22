import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: Props) {
  return (
    <View className="bg-status-error/10 border border-status-error/30 rounded-xl mx-4 my-2 p-3 flex-row items-center">
      <Ionicons name="alert-circle" size={20} color="#EF4444" />
      <Text className="text-text-primary text-sm flex-1 ml-2">{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} className="ml-2 px-3 py-1 rounded-lg bg-status-error/20">
          <Text className="text-status-error text-xs font-semibold">Retry</Text>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable onPress={onDismiss} className="ml-2 p-1">
          <Ionicons name="close" size={16} color="#A0A0AB" />
        </Pressable>
      )}
    </View>
  );
}
