import React, { useCallback } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useVoiceStore } from '../../stores/useVoiceStore';
import type { SongMetadata } from '../../types';

const SPOTIFY_GREEN = '#1DB954';

interface Props {
  messageId: string;
  metadata: SongMetadata;
  isMine: boolean;
}

/**
 * Inline song message bubble with album art, track info,
 * play/pause for 30s Spotify preview, and "Open in Spotify" link.
 */
export function SongMessageBubble({ messageId, metadata, isMine }: Props) {
  const playbackState = useVoiceStore((s) => s.playbackState);

  const isThisMessage = playbackState?.messageId === messageId;
  const isThisPlaying = isThisMessage && playbackState.isPlaying;
  const progress = isThisMessage ? playbackState.progress : 0;

  const handlePlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isThisPlaying) {
      useVoiceStore.getState().pauseVoice();
    } else if (!metadata.previewUrl) {
      return; // No preview available
    } else {
      useVoiceStore.getState().playSong(
        messageId,
        metadata.previewUrl,
        metadata.duration * 1000,
      );
    }
  }, [isThisPlaying, messageId, metadata.previewUrl, metadata.duration]);

  const handleOpenSpotify = useCallback(() => {
    Haptics.selectionAsync();
    if (metadata.spotifyUrl) {
      Linking.openURL(metadata.spotifyUrl);
    }
  }, [metadata.spotifyUrl]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // For the preview, duration is typically 30s from Spotify
  const previewDuration = metadata.previewUrl ? 30 : metadata.duration;
  const currentTime = Math.floor(progress * previewDuration);

  const accentColor = isMine ? '#FFFFFF' : '#2D1F14';
  const secondaryColor = isMine ? 'rgba(255,255,255,0.7)' : '#7A6355';
  const progressBg = isMine ? 'rgba(255,255,255,0.2)' : 'rgba(212,118,78,0.15)';
  const progressFill = isMine ? '#FFFFFF' : '#D4764E';

  return (
    <View style={{ minWidth: 240 }}>
      {/* Top section: album art + track info */}
      <View className="flex-row items-center mb-2">
        {/* Album art */}
        <Image
          source={{ uri: metadata.albumArt }}
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
          }}
          contentFit="cover"
          transition={200}
        />

        {/* Track info */}
        <View className="flex-1 ml-3" style={{ minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 15, fontWeight: '600', color: accentColor }}
          >
            {metadata.title}
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontSize: 13, color: secondaryColor, marginTop: 1 }}
          >
            {metadata.artist} · {metadata.album}
          </Text>
          {isThisMessage && (
            <Text
              style={{ fontSize: 11, color: secondaryColor, marginTop: 2 }}
            >
              {formatTime(currentTime)} / {formatTime(previewDuration)}
            </Text>
          )}
        </View>
      </View>

      {/* Bottom section: play/pause + progress bar + Spotify link */}
      <View className="flex-row items-center">
        {/* Play/pause button */}
        {metadata.previewUrl ? (
          <Pressable
            onPress={handlePlayPause}
            className="w-8 h-8 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: progressBg }}
          >
            <Ionicons
              name={isThisPlaying ? 'pause' : 'play'}
              size={16}
              color={progressFill}
              style={isThisPlaying ? undefined : { marginLeft: 1 }}
            />
          </Pressable>
        ) : (
          <View className="mr-2">
            <Text style={{ fontSize: 10, color: secondaryColor }}>
              No preview
            </Text>
          </View>
        )}

        {/* Progress bar */}
        <View
          className="flex-1 h-1 rounded-full mr-2 overflow-hidden"
          style={{ backgroundColor: progressBg }}
        >
          <View
            style={{
              width: `${Math.min(progress * 100, 100)}%`,
              height: '100%',
              backgroundColor: progressFill,
              borderRadius: 999,
            }}
          />
        </View>

        {/* Open in Spotify */}
        {metadata.spotifyUrl && (
          <Pressable onPress={handleOpenSpotify} hitSlop={8}>
            <Ionicons
              name="musical-note"
              size={18}
              color={SPOTIFY_GREEN}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
