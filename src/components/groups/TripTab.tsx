import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { EmptyState } from '../ui/EmptyState';
import { ItineraryItemModal } from './ItineraryItemModal';
import { CreateTripModal } from './CreateTripModal';
import { useGroupsStore } from '../../stores/useGroupsStore';
import type { ItineraryItem } from '../../types';

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  activity: 'flag',
  accommodation: 'bed',
  transport: 'car',
  meal: 'restaurant',
  other: 'ellipse',
};

interface Props {
  groupId: string;
}

export function TripTab({ groupId }: Props) {
  const group = useGroupsStore(useShallow((s) => s.getGroupById(groupId)));
  const trip = group?.trip;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [showCreateTrip, setShowCreateTrip] = useState(false);

  if (!trip) {
    return (
      <View className="flex-1 bg-background-primary items-center justify-center px-6">
        <View className="w-20 h-20 rounded-full bg-accent-primary/15 items-center justify-center mb-4">
          <Ionicons name="airplane" size={40} color="#D4764E" />
        </View>
        <Text className="text-text-primary text-lg font-semibold mb-1">No trip planned</Text>
        <Text className="text-text-tertiary text-sm text-center mb-6">Plan a trip to start building your itinerary</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCreateTrip(true);
          }}
          className="bg-accent-primary rounded-xl px-6 py-3"
        >
          <Text className="text-white text-[15px] font-semibold">Plan a Trip</Text>
        </Pressable>
        <CreateTripModal
          visible={showCreateTrip}
          onClose={() => setShowCreateTrip(false)}
          onSave={(tripData) => useGroupsStore.getState().createTrip(groupId, tripData)}
        />
      </View>
    );
  }

  const totalDays = Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return (
    <View className="flex-1 bg-background-primary">
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        <View className="mb-4">
          <Text className="text-text-primary text-xl font-bold">{trip.destination}</Text>
          <Text className="text-text-secondary text-sm mt-1">
            {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
          </Text>
        </View>
        {trip.itinerary.map((item, index) => {
          const showDayHeader = index === 0 || trip.itinerary[index - 1].day !== item.day;
          return (
            <View key={item.id}>
              {showDayHeader && <Text className="text-accent-primary text-sm font-bold mt-4 mb-2">Day {item.day}</Text>}
              <Pressable
                onLongPress={() => {
                  setEditingItem(item);
                  setModalVisible(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                className="flex-row mb-3"
              >
                <View className="items-center mr-3">
                  <View className="w-8 h-8 rounded-full bg-surface-elevated items-center justify-center">
                    <Ionicons name={typeIcons[item.type] || 'ellipse'} size={16} color="#7A6355" />
                  </View>
                  {index < trip.itinerary.length - 1 && <View className="w-[2px] flex-1 bg-border-subtle mt-1" />}
                </View>
                <View className="flex-1 pb-2">
                  <View className="flex-row items-center">
                    {item.time && <Text className="text-text-tertiary text-xs mr-2">{item.time}</Text>}
                    <Text className="text-text-primary font-medium flex-1">{item.title}</Text>
                    {item.cost != null && <Text className="text-text-secondary text-xs">${item.cost}</Text>}
                  </View>
                  {item.description && <Text className="text-text-secondary text-xs mt-0.5">{item.description}</Text>}
                </View>
              </Pressable>
            </View>
          );
        })}
        {trip.itinerary.length === 0 && (
          <View className="py-8 items-center">
            <Ionicons name="map-outline" size={32} color="#A8937F" />
            <Text className="text-text-tertiary text-sm mt-2">No items yet — tap + to add one</Text>
          </View>
        )}
      </ScrollView>
      <Pressable
        onPress={() => {
          setEditingItem(null);
          setModalVisible(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        className="absolute bottom-8 right-6 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
        style={{ shadowColor: '#D4764E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
      <ItineraryItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={(item) => {
          editingItem
            ? useGroupsStore.getState().editItineraryItem(groupId, item.id, item)
            : useGroupsStore.getState().addItineraryItem(groupId, item);
        }}
        onDelete={editingItem ? (id) => useGroupsStore.getState().deleteItineraryItem(groupId, id) : undefined}
        existingItem={editingItem}
        totalDays={totalDays}
      />
    </View>
  );
}
