import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Avatar } from '../ui/Avatar';
import { useCallStore } from '../../stores/useCallStore';
import { useUserStore } from '../../stores/useUserStore';

export function IncomingCallScreen() {
  const incomingCall = useCallStore((s) => s.incomingCall);
  const getUserById = useUserStore((s) => s.getUserById);

  // Pulse animation for incoming ring
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.3);

  useEffect(() => {
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 1200 }),
        withTiming(1, { duration: 1200 }),
      ),
      -1,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1200 }),
        withTiming(0.3, { duration: 1200 }),
      ),
      -1,
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  if (!incomingCall) return null;

  const caller = getUserById(incomingCall.callerId);
  const isVideo = incomingCall.type === 'video';

  const handleAccept = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useCallStore.getState().answerCall();
  };

  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useCallStore.getState().declineCall();
  };

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <View className="flex-1 bg-background-primary items-center justify-center">
        {/* Pulse ring */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 180,
              height: 180,
              borderRadius: 90,
              borderWidth: 2,
              borderColor: isVideo ? '#5B8EC9' : '#2D9F6F',
            },
            ringStyle,
          ]}
        />

        {/* Avatar */}
        <View className="mb-6">
          <Avatar uri={caller?.avatar ?? ''} size="xl" />
        </View>

        {/* Caller info */}
        <Text className="text-text-primary text-2xl font-bold mb-1">
          {caller?.name ?? 'Unknown'}
        </Text>
        <Text className="text-text-tertiary text-[15px]">
          Incoming {isVideo ? 'video' : 'voice'} call...
        </Text>

        {/* Accept / Decline */}
        <View className="flex-row items-center gap-16 mt-20">
          {/* Decline */}
          <View className="items-center">
            <Pressable
              onPress={handleDecline}
              className="w-18 h-18 rounded-full bg-status-error items-center justify-center"
              style={{
                width: 72,
                height: 72,
                shadowColor: '#C94F4F',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
              }}
            >
              <Ionicons name="call" size={30} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </Pressable>
            <Text className="text-text-tertiary text-[13px] mt-2">Decline</Text>
          </View>

          {/* Accept */}
          <View className="items-center">
            <Pressable
              onPress={handleAccept}
              className="items-center justify-center"
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: '#2D9F6F',
                shadowColor: '#2D9F6F',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
              }}
            >
              <Ionicons
                name={isVideo ? 'videocam' : 'call'}
                size={30}
                color="#FFFFFF"
              />
            </Pressable>
            <Text className="text-text-tertiary text-[13px] mt-2">Accept</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
