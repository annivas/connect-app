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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { SearchBar } from '../ui/SearchBar';

const API_KEY = Constants.expoConfig?.extra?.googlePlacesApiKey ?? '';

interface PlacePrediction {
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  description: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: {
    latitude: number;
    longitude: number;
    address: string;
    placeName: string;
  }) => void;
}

export function LocationPickerModal({
  visible,
  onClose,
  onSelectLocation,
}: Props) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPlaces = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 2) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK') {
          setPredictions(data.predictions);
        } else {
          setPredictions([]);
        }
      } catch {
        setPredictions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const selectPlace = async (prediction: PlacePrediction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoadingDetails(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address,name&key=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.result) {
        const { result } = data;
        onSelectLocation({
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          address: result.formatted_address ?? '',
          placeName: result.name ?? '',
        });
        handleClose();
      } else {
        Alert.alert('Error', 'Could not load place details.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setPredictions([]);
    setIsSearching(false);
    setIsLoadingDetails(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onClose();
  };

  const renderPrediction = ({ item }: { item: PlacePrediction }) => (
    <Pressable
      onPress={() => selectPlace(item)}
      className="flex-row items-center px-4 py-3 border-b border-border-subtle"
    >
      <View className="w-9 h-9 rounded-full bg-status-success/15 items-center justify-center mr-3">
        <Ionicons name="location-outline" size={20} color="#2D9F6F" />
      </View>
      <View className="flex-1">
        <Text className="text-text-primary text-[15px] font-medium">
          {item.structured_formatting.main_text}
        </Text>
        <Text
          className="text-text-tertiary text-[13px] mt-0.5"
          numberOfLines={1}
        >
          {item.structured_formatting.secondary_text}
        </Text>
      </View>
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
            Pick Location
          </Text>
        </View>

        {/* Search */}
        <View className="px-4 py-3">
          <SearchBar
            value={query}
            onChangeText={searchPlaces}
            placeholder="Search for a place..."
          />
        </View>

        {/* API key warning */}
        {!API_KEY && (
          <View className="px-4 py-3">
            <Text className="text-status-warning text-[13px] text-center">
              Google Places API key not configured.
            </Text>
          </View>
        )}

        {/* Loading overlay for place details */}
        {isLoadingDetails && (
          <View className="absolute inset-0 z-10 items-center justify-center bg-black/20">
            <View className="bg-surface-elevated rounded-2xl p-6">
              <ActivityIndicator size="large" color="#D4764E" />
              <Text className="text-text-secondary text-[13px] mt-2">
                Loading place...
              </Text>
            </View>
          </View>
        )}

        {/* Results */}
        <FlatList
          data={predictions}
          keyExtractor={(item) => item.place_id}
          renderItem={renderPrediction}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="items-center pt-16">
              {isSearching ? (
                <ActivityIndicator size="small" color="#D4764E" />
              ) : query.length > 0 ? (
                <>
                  <Ionicons
                    name="location-outline"
                    size={40}
                    color="#A8937F"
                  />
                  <Text className="text-text-tertiary text-[15px] mt-3">
                    No places found
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="search" size={40} color="#A8937F" />
                  <Text className="text-text-tertiary text-[15px] mt-3">
                    Search for a place
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
