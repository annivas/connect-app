import React from 'react';
import { View, Pressable, ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated';
}

export function Card({
  children,
  onPress,
  variant = 'default',
  className = '',
  ...props
}: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bg = variant === 'elevated' ? 'bg-surface-elevated' : 'bg-surface';

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }}
        style={animatedStyle}
        className={`rounded-2xl p-4 ${bg} ${className}`}
        {...props}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View className={`rounded-2xl p-4 ${bg} ${className}`} {...props}>
      {children}
    </View>
  );
}
