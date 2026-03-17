import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

interface Props {
  onNewMessage: () => void;
  onNewGroup: () => void;
  onNewNote: () => void;
  onNewReminder: () => void;
  onNewExpense: () => void;
}

export function QuickComposeFAB({ onNewMessage, onNewGroup, onNewNote, onNewReminder, onNewExpense }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const actions: QuickAction[] = [
    {
      icon: 'chatbubble-outline',
      label: 'New Message',
      color: '#D4764E',
      onPress: onNewMessage,
    },
    {
      icon: 'people-outline',
      label: 'New Group',
      color: '#5B8EC9',
      onPress: onNewGroup,
    },
    {
      icon: 'document-text-outline',
      label: 'Quick Note',
      color: '#D4964E',
      onPress: onNewNote,
    },
    {
      icon: 'wallet-outline',
      label: 'New Expense',
      color: '#2D9F6F',
      onPress: onNewExpense,
    },
    {
      icon: 'alarm-outline',
      label: 'Reminder',
      color: '#D4964E',
      onPress: onNewReminder,
    },
  ];

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(!isOpen);
    rotation.value = withSpring(isOpen ? 0 : 1, { damping: 15, stiffness: 300 });
  };

  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value * 45}deg` },
    ],
  }));

  return (
    <>
      {isOpen && (
        <Modal transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
          <Pressable
            className="flex-1 justify-end items-end pb-28 pr-4"
            onPress={() => {
              setIsOpen(false);
              rotation.value = withSpring(0, { damping: 15, stiffness: 300 });
            }}
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            <View className="mb-4">
              {actions.map((action, index) => (
                <Pressable
                  key={action.label}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsOpen(false);
                    rotation.value = withSpring(0, { damping: 15, stiffness: 300 });
                    action.onPress();
                  }}
                  className="flex-row items-center justify-end mb-3 active:opacity-80"
                >
                  <View className="bg-surface-elevated rounded-full px-3 py-1.5 mr-2 shadow-sm">
                    <Text className="text-text-primary text-sm font-medium">{action.label}</Text>
                  </View>
                  <View
                    className="w-11 h-11 rounded-full items-center justify-center shadow-md"
                    style={{ backgroundColor: action.color }}
                  >
                    <Ionicons name={action.icon} size={22} color="#FFFFFF" />
                  </View>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      )}
      <AnimatedPressable
        onPress={handleToggle}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }}
        style={[
          animatedFabStyle,
          {
            position: 'absolute',
            bottom: 100,
            right: 16,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#D4764E',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          },
        ]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </AnimatedPressable>
    </>
  );
}
