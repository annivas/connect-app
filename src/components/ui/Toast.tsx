import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { Toast as ToastData, ToastType } from '../../stores/useToastStore';

const TOAST_CONFIG: Record<
  ToastType,
  { icon: keyof typeof Ionicons.glyphMap; bg: string; iconColor: string; borderColor: string }
> = {
  success: {
    icon: 'checkmark-circle',
    bg: '#F0FAF5',
    iconColor: '#2D9F6F',
    borderColor: '#C8E6D8',
  },
  error: {
    icon: 'alert-circle',
    bg: '#FDF2F2',
    iconColor: '#C94F4F',
    borderColor: '#F0C8C8',
  },
  info: {
    icon: 'information-circle',
    bg: '#F0F5FA',
    iconColor: '#5B8EC9',
    borderColor: '#C8D8F0',
  },
  warning: {
    icon: 'warning',
    bg: '#FDF8F0',
    iconColor: '#D4964E',
    borderColor: '#F0E0C8',
  },
};

interface Props {
  toast: ToastData;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: Props) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const config = TOAST_CONFIG[toast.type];
  const duration = toast.duration ?? 3000;

  useEffect(() => {
    // Slide in
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });

    if (toast.type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Auto-dismiss
    const timer = setTimeout(() => {
      dismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    translateY.value = withSpring(-100, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onDismiss)();
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: config.bg,
          borderColor: config.borderColor,
          borderWidth: 1,
          borderRadius: 14,
          marginHorizontal: 16,
          marginBottom: 8,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        },
        animatedStyle,
      ]}
    >
      <Ionicons name={config.icon} size={20} color={config.iconColor} />
      <Text
        className="flex-1 text-text-primary text-[14px] ml-2.5"
        numberOfLines={2}
      >
        {toast.message}
      </Text>
      {toast.action && (
        <Pressable
          onPress={() => {
            toast.action!.onPress();
            dismiss();
          }}
          className="ml-2 px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: `${config.iconColor}15` }}
        >
          <Text
            className="text-[13px] font-semibold"
            style={{ color: config.iconColor }}
          >
            {toast.action.label}
          </Text>
        </Pressable>
      )}
      <Pressable onPress={dismiss} className="ml-2 p-1">
        <Ionicons name="close" size={16} color="#A8937F" />
      </Pressable>
    </Animated.View>
  );
}
