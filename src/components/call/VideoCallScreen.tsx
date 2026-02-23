import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { useCallStore } from '../../stores/useCallStore';
import { useUserStore } from '../../stores/useUserStore';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function VideoCallScreen() {
  const activeCall = useCallStore((s) => s.activeCall);
  const isInCall = useCallStore((s) => s.isInCall);
  const getUserById = useUserStore((s) => s.getUserById);
  const [duration, setDuration] = useState(0);

  // Duration timer
  useEffect(() => {
    if (!isInCall || !activeCall) return;
    const start = activeCall.startedAt.getTime();
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isInCall, activeCall]);

  if (!isInCall || !activeCall || activeCall.type !== 'video') return null;

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

  const handleToggleVideo = () => {
    Haptics.selectionAsync();
    useCallStore.getState().toggleVideo();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <View className="flex-1 bg-[#0A0A0F]">
        {/* Remote video placeholder — dark background with avatar */}
        <View className="flex-1 items-center justify-center">
          <Avatar uri={otherUser?.avatar ?? ''} size="xl" />
          <Text className="text-text-primary text-xl font-bold mt-4">
            {otherUser?.name ?? 'Unknown'}
          </Text>
          <Text className="text-text-tertiary text-[14px] mt-1">
            {duration > 0 ? formatDuration(duration) : 'Connecting video...'}
          </Text>
        </View>

        {/* Self-view PiP (placeholder) */}
        <View
          className="absolute top-14 right-4 bg-surface-elevated rounded-2xl items-center justify-center"
          style={{ width: 100, height: 140 }}
        >
          <Ionicons name="person" size={36} color="#A8937F" />
          <Text className="text-text-tertiary text-[10px] mt-1">You</Text>
          {!activeCall.isVideoEnabled && (
            <View className="absolute inset-0 bg-background-primary/80 rounded-2xl items-center justify-center">
              <Ionicons name="videocam-off" size={24} color="#C94F4F" />
            </View>
          )}
        </View>

        {/* Bottom controls */}
        <View className="pb-12 pt-4 bg-gradient-to-t from-black/60">
          <View className="flex-row items-center justify-center gap-6">
            {/* Mute */}
            <Pressable
              onPress={handleToggleMute}
              className={`w-14 h-14 rounded-full items-center justify-center ${
                activeCall.isMuted ? 'bg-white/20' : 'bg-surface-elevated'
              }`}
            >
              <Ionicons
                name={activeCall.isMuted ? 'mic-off' : 'mic'}
                size={24}
                color={activeCall.isMuted ? '#C94F4F' : '#FFFFFF'}
              />
            </Pressable>

            {/* Camera toggle */}
            <Pressable
              onPress={handleToggleVideo}
              className={`w-14 h-14 rounded-full items-center justify-center ${
                !activeCall.isVideoEnabled ? 'bg-white/20' : 'bg-surface-elevated'
              }`}
            >
              <Ionicons
                name={activeCall.isVideoEnabled ? 'videocam' : 'videocam-off'}
                size={24}
                color={!activeCall.isVideoEnabled ? '#C94F4F' : '#FFFFFF'}
              />
            </Pressable>

            {/* End Call */}
            <Pressable
              onPress={handleEndCall}
              className="w-16 h-16 rounded-full bg-status-error items-center justify-center"
              style={{
                shadowColor: '#C94F4F',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
              }}
            >
              <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
