import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Channel } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string | null) => void;
  onCreateChannel: () => void;
  onLongPressChannel: (channel: Channel) => void;
}

function ChannelPill({
  label,
  emoji,
  color,
  isActive,
  onPress,
  onLongPress,
}: {
  label: string;
  emoji?: string;
  color?: string;
  isActive: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={animatedStyle}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      onLongPress={onLongPress ? () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
      } : undefined}
    >
      <View
        className={`flex-row items-center rounded-full px-3 py-1.5 mr-2 ${
          isActive ? '' : 'border'
        }`}
        style={
          isActive
            ? { backgroundColor: color || '#D4764E' }
            : { borderColor: '#E8D5C4' }
        }
      >
        {emoji ? (
          <Text className="text-sm mr-1">{emoji}</Text>
        ) : null}
        <Text
          className={`text-xs font-semibold ${
            isActive ? 'text-white' : 'text-text-secondary'
          }`}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

export function ChannelStrip({
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  onLongPressChannel,
}: Props) {
  return (
    <View className="pb-1 pt-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {/* General channel (always first) */}
        <ChannelPill
          label="General"
          emoji="💬"
          color="#D4764E"
          isActive={activeChannelId === null}
          onPress={() => onSelectChannel(null)}
        />

        {/* User-created channels */}
        {channels.map((channel) => (
          <ChannelPill
            key={channel.id}
            label={channel.name}
            emoji={channel.emoji}
            color={channel.color}
            isActive={activeChannelId === channel.id}
            onPress={() => onSelectChannel(channel.id)}
            onLongPress={() => onLongPressChannel(channel)}
          />
        ))}

        {/* Add channel button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCreateChannel();
          }}
        >
          <View className="items-center justify-center rounded-full border border-border w-8 h-8">
            <Ionicons name="add" size={18} color="#7A6355" />
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
