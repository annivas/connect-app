import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { WaveformVisualizer } from './WaveformVisualizer';
import { useVoiceStore } from '../../stores/useVoiceStore';
import type { VoiceMessageMetadata } from '../../types';

interface Props {
  messageId: string;
  metadata: VoiceMessageMetadata;
  isMine: boolean;
}

/**
 * Custom bubble for audio/voice messages. Shows play/pause button,
 * waveform visualization with progress, duration, and speed toggle.
 */
export function VoiceMessageBubble({ messageId, metadata, isMine }: Props) {
  const playbackState = useVoiceStore((s) => s.playbackState);
  const isThisPlaying =
    playbackState?.messageId === messageId && playbackState.isPlaying;
  const progress = playbackState?.messageId === messageId ? playbackState.progress : 0;
  const speed = playbackState?.messageId === messageId ? playbackState.speed : 1;

  // Simulate playback progress
  const progressRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (isThisPlaying) {
      progressRef.current = setInterval(() => {
        const state = useVoiceStore.getState();
        if (!state.playbackState || state.playbackState.messageId !== messageId) {
          if (progressRef.current) clearInterval(progressRef.current);
          return;
        }

        const currentSpeed = state.playbackState.speed;
        const newProgress = state.playbackState.progress + (0.05 * currentSpeed);

        if (newProgress >= 1) {
          state.stopPlayback();
          if (progressRef.current) clearInterval(progressRef.current);
        } else {
          state.seekVoice(newProgress);
        }
      }, 100);
    }

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isThisPlaying, messageId]);

  const handlePlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isThisPlaying) {
      useVoiceStore.getState().pauseVoice();
    } else {
      useVoiceStore.getState().playVoice(messageId);
    }
  }, [isThisPlaying, messageId]);

  const handleSpeedToggle = useCallback(() => {
    Haptics.selectionAsync();
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    useVoiceStore.getState().setPlaybackSpeed(nextSpeed);
  }, [speed]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentTime = Math.floor(progress * metadata.duration);
  const remaining = metadata.duration - currentTime;

  const accentColor = isMine ? '#FFFFFF' : '#6366F1';
  const secondaryColor = isMine ? 'rgba(255,255,255,0.6)' : '#A0A0AB';
  const waveActiveColor = isMine ? '#FFFFFF' : '#6366F1';
  const waveInactiveColor = isMine ? 'rgba(255,255,255,0.3)' : 'rgba(99,102,241,0.25)';

  return (
    <View className="flex-row items-center py-1" style={{ minWidth: 200 }}>
      {/* Play/pause button */}
      <Pressable
        onPress={handlePlayPause}
        className="w-10 h-10 rounded-full items-center justify-center mr-2.5"
        style={{
          backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.15)',
        }}
      >
        <Ionicons
          name={isThisPlaying ? 'pause' : 'play'}
          size={20}
          color={accentColor}
          style={isThisPlaying ? undefined : { marginLeft: 2 }}
        />
      </Pressable>

      {/* Waveform + info */}
      <View className="flex-1">
        <WaveformVisualizer
          samples={metadata.waveformSamples}
          progress={progress}
          height={24}
          barCount={30}
          activeColor={waveActiveColor}
          inactiveColor={waveInactiveColor}
        />

        <View className="flex-row items-center justify-between mt-1">
          <Text style={{ fontSize: 11, color: secondaryColor }}>
            {isThisPlaying || progress > 0
              ? formatDuration(remaining)
              : formatDuration(metadata.duration)}
          </Text>

          {/* Speed toggle */}
          {(isThisPlaying || progress > 0) && (
            <Pressable
              onPress={handleSpeedToggle}
              className="px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.15)',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: accentColor }}>
                {speed}×
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
