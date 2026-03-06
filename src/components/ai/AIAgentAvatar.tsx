import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { AIProvider } from '../../types';

interface Props {
  uri: string;
  size?: 'sm' | 'md' | 'lg';
  provider?: AIProvider;
  color?: string;
  isConnected?: boolean;
}

const SIZES = {
  sm: 32,
  md: 40,
  lg: 52,
};

const PROVIDER_COLORS: Record<AIProvider, string> = {
  anthropic: '#D4764E',
  openai: '#10A37F',
  google: '#4285F4',
};

export function AIAgentAvatar({ uri, size = 'md', provider, color, isConnected = true }: Props) {
  const px = SIZES[size];
  const borderColor = color ?? (provider ? PROVIDER_COLORS[provider] : '#D4764E');

  return (
    <View
      style={{
        width: px,
        height: px,
        borderRadius: px / 2,
        borderWidth: 2,
        borderColor,
        overflow: 'hidden',
        opacity: isConnected ? 1 : 0.5,
      }}
      className="items-center justify-center bg-surface-elevated"
    >
      <Image
        source={{ uri }}
        style={{ width: px - 8, height: px - 8 }}
        contentFit="contain"
        transition={200}
      />
      {isConnected && (
        <View
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: size === 'lg' ? 16 : 12,
            height: size === 'lg' ? 16 : 12,
            borderRadius: size === 'lg' ? 8 : 6,
            backgroundColor: '#2D9F6F',
            borderWidth: 2,
            borderColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="flash" size={size === 'lg' ? 8 : 6} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}
