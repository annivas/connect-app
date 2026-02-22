import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

interface Props {
  message?: string;
}

export function LoadingScreen({ message }: Props) {
  return (
    <View className="flex-1 bg-background-primary items-center justify-center">
      <ActivityIndicator size="large" color="#6366F1" />
      {message && (
        <Text className="text-text-secondary text-sm mt-4">{message}</Text>
      )}
    </View>
  );
}
