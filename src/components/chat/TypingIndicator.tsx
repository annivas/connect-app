import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useUserStore } from '../../stores/useUserStore';

interface Props {
  typingUserIds: string[];
}

function AnimatedDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1, // infinite
      ),
    );
  }, [delay, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#6B6B76', marginHorizontal: 1.5 }, animatedStyle]}
    />
  );
}

export function TypingIndicator({ typingUserIds }: Props) {
  const getUserById = useUserStore((s) => s.getUserById);

  if (typingUserIds.length === 0) return null;

  const names = typingUserIds
    .map((id) => getUserById(id)?.name ?? 'Someone')
    .slice(0, 2);

  let label: string;
  if (names.length === 1) {
    label = `${names[0]} is typing`;
  } else if (names.length === 2) {
    label = `${names[0]} and ${names[1]} are typing`;
  } else {
    label = 'Several people are typing';
  }

  return (
    <View className="flex-row items-center px-4 py-1">
      <Text className="text-text-tertiary text-xs mr-1.5">{label}</Text>
      <View className="flex-row items-center">
        <AnimatedDot delay={0} />
        <AnimatedDot delay={150} />
        <AnimatedDot delay={300} />
      </View>
    </View>
  );
}
