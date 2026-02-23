import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { WaveformVisualizer } from './WaveformVisualizer';
import { useVoiceStore } from '../../stores/useVoiceStore';

interface Props {
  onSendVoice: (data: { duration: number; waveformSamples: number[]; uri: string }) => void;
}

const CANCEL_SLIDE_THRESHOLD = -80;

/**
 * Hold-to-record microphone button. While recording, shows a floating
 * UI with waveform, duration, and slide-to-cancel gesture.
 * Release to send, slide left to cancel.
 */
export function VoiceRecordButton({ onSendVoice }: Props) {
  const isRecording = useVoiceStore((s) => s.isRecording);
  const recordingDuration = useVoiceStore((s) => s.recordingDuration);
  const waveformSamples = useVoiceStore((s) => s.waveformSamples);

  const durationRef = useRef<ReturnType<typeof setInterval>>(null);
  const waveformRef = useRef<ReturnType<typeof setInterval>>(null);

  // Animated values
  const pulseScale = useSharedValue(1);
  const slideX = useSharedValue(0);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
    opacity: Math.max(0.3, 1 + slideX.value / 150),
  }));

  // Start recording — simulated with timers for mock mode
  const startRecording = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useVoiceStore.getState().startRecording();

    // Pulse animation
    pulseScale.value = withRepeat(
      withTiming(1.15, { duration: 600 }),
      -1,
      true,
    );

    // Simulate duration counter
    durationRef.current = setInterval(() => {
      const { recordingDuration: d, isRecording: r } = useVoiceStore.getState();
      if (!r) return;
      useVoiceStore.getState().updateRecordingDuration(d + 0.1);
    }, 100);

    // Simulate waveform samples
    waveformRef.current = setInterval(() => {
      if (!useVoiceStore.getState().isRecording) return;
      const sample = 0.2 + Math.random() * 0.8;
      useVoiceStore.getState().addWaveformSample(sample);
    }, 80);
  }, [pulseScale]);

  // Stop recording & send
  const stopAndSend = useCallback(() => {
    if (durationRef.current) clearInterval(durationRef.current);
    if (waveformRef.current) clearInterval(waveformRef.current);
    pulseScale.value = withSpring(1);
    slideX.value = withSpring(0);

    if (!useVoiceStore.getState().isRecording) return;

    const data = useVoiceStore.getState().stopRecording();
    if (data.duration >= 0.5) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSendVoice(data);
    }
  }, [onSendVoice, pulseScale, slideX]);

  // Cancel recording
  const cancel = useCallback(() => {
    if (durationRef.current) clearInterval(durationRef.current);
    if (waveformRef.current) clearInterval(waveformRef.current);
    pulseScale.value = withSpring(1);
    slideX.value = withSpring(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    useVoiceStore.getState().cancelRecording();
  }, [pulseScale, slideX]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
      if (waveformRef.current) clearInterval(waveformRef.current);
    };
  }, []);

  // Long-press gesture to start recording, release or slide to cancel
  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      startRecording();
    })
    .onEnd(() => {
      if (useVoiceStore.getState().isRecording) {
        stopAndSend();
      }
    });

  const panGesture = Gesture.Pan()
    .activeOffsetX(-10)
    .onUpdate((e) => {
      if (!useVoiceStore.getState().isRecording) return;
      slideX.value = Math.min(0, e.translationX);
    })
    .onEnd(() => {
      if (slideX.value < CANCEL_SLIDE_THRESHOLD) {
        cancel();
      } else if (useVoiceStore.getState().isRecording) {
        stopAndSend();
      }
      slideX.value = withSpring(0);
    });

  const composed = Gesture.Simultaneous(longPressGesture, panGesture);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View>
      {/* Recording overlay — shown above the button when recording */}
      {isRecording && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          className="absolute bottom-12 right-0 left-[-200px]"
        >
          <Animated.View style={slideStyle}>
            <View className="flex-row items-center bg-surface-elevated rounded-full px-4 py-2.5 border border-border-subtle"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {/* Red recording dot */}
              <Animated.View style={pulseStyle}>
                <View className="w-3 h-3 rounded-full bg-status-error mr-2" />
              </Animated.View>

              <Text className="text-text-primary text-[14px] font-mono mr-3">
                {formatDuration(recordingDuration)}
              </Text>

              <View className="flex-1">
                <WaveformVisualizer
                  samples={waveformSamples}
                  height={20}
                  barCount={24}
                  activeColor="#EF4444"
                  inactiveColor="rgba(239, 68, 68, 0.3)"
                />
              </View>

              <Text className="text-text-tertiary text-[11px] ml-2">
                ◂ Slide to cancel
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Microphone button */}
      <GestureDetector gesture={composed}>
        <Animated.View style={pulseStyle}>
          <Pressable
            className={`w-9 h-9 rounded-full items-center justify-center mb-0.5 ${
              isRecording ? 'bg-status-error' : 'bg-transparent'
            }`}
          >
            <Ionicons
              name={isRecording ? 'mic' : 'mic-outline'}
              size={22}
              color={isRecording ? '#FFFFFF' : '#A8937F'}
            />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
