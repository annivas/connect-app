import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

interface Props {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 8, style }: Props) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 0.8]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#F0E2D4',
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function ConversationListSkeleton() {
  return (
    <View className="px-4 py-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} className="flex-row items-center mb-4">
          <Skeleton width={52} height={52} borderRadius={26} />
          <View className="ml-3 flex-1">
            <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="85%" height={12} />
          </View>
          <Skeleton width={40} height={10} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

export function MessageBubbleSkeleton() {
  return (
    <View className="px-4 py-3">
      {Array.from({ length: 6 }).map((_, i) => {
        const isRight = i % 3 === 0;
        return (
          <View
            key={i}
            className={`mb-3 ${isRight ? 'items-end' : 'items-start'}`}
          >
            <Skeleton
              width={isRight ? 200 : 240}
              height={isRight ? 44 : 56}
              borderRadius={16}
            />
          </View>
        );
      })}
    </View>
  );
}
