import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  badge?: string | number;
  badgeColor?: string;
  preview?: React.ReactNode;
  onPress: () => void;
}

export function ConversationInfoSection({
  icon,
  title,
  badge,
  badgeColor = '#7A6355',
  preview,
  onPress,
}: Props) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className="mx-4 mb-3 bg-surface rounded-2xl overflow-hidden active:bg-surface-hover"
    >
      {/* Header row */}
      <View className="flex-row items-center px-4 py-3.5">
        <View className="w-8 h-8 rounded-full bg-background-secondary items-center justify-center mr-3">
          <Ionicons name={icon} size={17} color="#7A6355" />
        </View>
        <Text className="flex-1 text-text-primary text-[15px] font-medium">
          {title}
        </Text>
        {badge != null && (
          <View
            className="rounded-full px-2.5 py-0.5 mr-2"
            style={{ backgroundColor: `${badgeColor}15` }}
          >
            <Text className="text-xs font-semibold" style={{ color: badgeColor }}>
              {badge}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#A8937F" />
      </View>

      {/* Preview content (optional) */}
      {preview && (
        <View className="px-4 pb-3.5 -mt-1">
          {preview}
        </View>
      )}
    </Pressable>
  );
}
