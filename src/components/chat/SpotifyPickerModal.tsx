import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SearchBar } from '../ui/SearchBar';
import { searchTracks, isConfigured } from '../../utils/spotify';
import type { SongMetadata } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectSong: (song: SongMetadata) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SpotifyPickerModal({ visible, onClose, onSelectSong }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongMetadata[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const tracks = await searchTracks(text);
        setResults(tracks);
      } catch {
        setResults([]);
        Alert.alert('Error', 'Could not search Spotify. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleSelectSong = (song: SongMetadata) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectSong(song);
    handleClose();
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onClose();
  };

  const renderTrack = ({ item }: { item: SongMetadata }) => (
    <Pressable
      onPress={() => handleSelectSong(item)}
      className="flex-row items-center px-4 py-3 border-b border-border-subtle"
    >
      <Image
        source={{ uri: item.albumArt }}
        style={{ width: 48, height: 48, borderRadius: 8 }}
        contentFit="cover"
      />
      <View className="flex-1 ml-3">
        <Text className="text-text-primary text-[15px] font-medium" numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="text-text-tertiary text-[13px] mt-0.5" numberOfLines={1}>
          {item.artist} · {item.album}
        </Text>
      </View>
      <Text className="text-text-tertiary text-[12px] ml-2">
        {formatDuration(item.duration)}
      </Text>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-border-subtle">
          <Pressable onPress={handleClose} className="mr-3">
            <Ionicons name="close" size={24} color="#A8937F" />
          </Pressable>
          <Text className="text-text-primary text-lg font-semibold flex-1">
            Share Song
          </Text>
          <Ionicons name="musical-note" size={20} color="#1DB954" />
        </View>

        {/* Search */}
        <View className="px-4 py-3">
          <SearchBar
            value={query}
            onChangeText={handleSearch}
            placeholder="Search songs, artists..."
          />
        </View>

        {/* API key warning */}
        {!isConfigured() && (
          <View className="px-4 py-3">
            <Text className="text-status-warning text-[13px] text-center">
              Spotify API not configured.
            </Text>
          </View>
        )}

        {/* Results */}
        <FlatList
          data={results}
          keyExtractor={(item, index) =>
            `${item.spotifyUrl ?? item.title}-${index}`
          }
          renderItem={renderTrack}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="items-center pt-16">
              {isSearching ? (
                <ActivityIndicator size="small" color="#1DB954" />
              ) : query.length > 0 ? (
                <>
                  <Ionicons name="musical-note" size={40} color="#A8937F" />
                  <Text className="text-text-tertiary text-[15px] mt-3">
                    No songs found
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="search" size={40} color="#A8937F" />
                  <Text className="text-text-tertiary text-[15px] mt-3">
                    Search for a song
                  </Text>
                </>
              )}
            </View>
          }
        />
      </View>
    </Modal>
  );
}
