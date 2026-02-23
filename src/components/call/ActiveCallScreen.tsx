import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { Avatar } from '../ui/Avatar';
import { useCallStore } from '../../stores/useCallStore';
import { useUserStore } from '../../stores/useUserStore';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function ActiveCallScreen() {
  const activeCall = useCallStore((s) => s.activeCall);
  const isInCall = useCallStore((s) => s.isInCall);
  const getUserById = useUserStore((s) => s.getUserById);
  const [duration, setDuration] = useState(0);

  // Pulse ring animation
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 1500 }),
        withTiming(1, { duration: 1500 }),
      ),
      -1,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1500 }),
        withTiming(0.5, { duration: 1500 }),
      ),
      -1,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Duration timer
  useEffect(() => {
    if (!isInCall || !activeCall) return;
    const start = activeCall.startedAt.getTime();
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isInCall, activeCall]);

  if (!isInCall || !activeCall || activeCall.type === 'video') return null;

  const otherUser = getUserById(activeCall.participants[0] ?? '');

  const handleEndCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useCallStore.getState().endCall();
    setDuration(0);
  };

  const handleToggleMute = () => {
    Haptics.selectionAsync();
    useCallStore.getState().toggleMute();
  };

  const handleToggleSpeaker = () => {
    Haptics.selectionAsync();
    useCallStore.getState().toggleSpeaker();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <View className="flex-1 bg-background-primary items-center justify-center">
        {/* Pulse ring behind avatar */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: '#6366F1',
            },
            pulseStyle,
          ]}
        />

        {/* Avatar */}
        <View className="mb-6">
          <Avatar uri={otherUser?.avatar ?? ''} size="xl" />
        </View>

        {/* Name */}
        <Text className="text-text-primary text-2xl font-bold mb-1">
          {otherUser?.name ?? 'Unknown'}
        </Text>

        {/* Status / Duration */}
        <Text className="text-text-tertiary text-[15px]">
          {duration > 0 ? formatDuration(duration) : 'Calling...'}
        </Text>

        {/* Controls */}
        <View className="flex-row items-center mt-16 gap-8">
          {/* Mute */}
          <Pressable
            onPress={handleToggleMute}
            className={`w-16 h-16 rounded-full items-center justify-center ${
              activeCall.isMuted ? 'bg-white/20' : 'bg-surface-elevated'
            }`}
          >
            <Ionicons
              name={activeCall.isMuted ? 'mic-off' : 'mic'}
              size={26}
              color={activeCall.isMuted ? '#EF4444' : '#F5F5F7'}
            />
          </Pressable>

          {/* Speaker */}
          <Pressable
            onPress={handleToggleSpeaker}
            className={`w-16 h-16 rounded-full items-center justify-center ${
              activeCall.isSpeakerOn ? 'bg-white/20' : 'bg-surface-elevated'
            }`}
          >
            <Ionicons
              name={activeCall.isSpeakerOn ? 'volume-high' : 'volume-medium'}
              size={26}
              color="#F5F5F7"
            />
          </Pressable>
        </View>

        {/* End Call */}
        <Pressable
          onPress={handleEndCall}
          className="w-20 h-20 rounded-full bg-status-error items-center justify-center mt-12"
          style={{
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
          }}
        >
          <Ionicons name="call" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>

        <Text className="text-text-tertiary text-[12px] mt-4">
          Voice Call
        </Text>
      </View>
    </Modal>
  );
}
