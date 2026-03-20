import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, ActionSheetIOS, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { EmptyState } from '../ui/EmptyState';
import { ItineraryItemModal } from './ItineraryItemModal';
import { CreateTripModal } from './CreateTripModal';
import { ArrivalDepartureWizard } from './ArrivalDepartureWizard';
import { useGroupsStore } from '../../stores/useGroupsStore';
import type { ItineraryItem } from '../../types';

const TYPE_DOT_COLOR: Record<string, string> = {
  arrival:   '#D4764E',
  departure: '#5B8EC9',
  activity:  '#2D9F6F',
  meal:      '#D4964E',
  stay:      '#8B6F5A',
  transport: '#C2956B',
  other:     '#A8937F',
};

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  arrival:   'airplane-outline',
  departure: 'airplane-outline',
  activity:  'flag-outline',
  stay:      'bed-outline',
  transport: 'car-outline',
  meal:      'restaurant-outline',
  other:     'ellipse-outline',
};

function getReferenceChip(item: ItineraryItem): string | null {
  const d = item.travelDetails;
  if (!d) return null;
  switch (item.transportMethod) {
    case 'airplane': return d.flightNumber ?? null;
    case 'train':    return d.trainNumber ?? null;
    case 'ferry':    return d.carOnFerry
      ? `${d.ferryCompany ?? 'Ferry'}  ·  🚗 Car on board`
      : (d.ferryCompany ?? null);
    case 'bus':      return d.busLine ?? null;
    default:         return null;
  }
}

interface Props {
  groupId: string;
}

export function TripTab({ groupId }: Props) {
  const group = useGroupsStore(useShallow((s) => s.getGroupById(groupId)));
  const trip = group?.trip;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(false);
  const [wizardItem, setWizardItem] = useState<ItineraryItem | null>(null);

  const handleAddPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const options = [
      'Arrival / Departure',
      'Activity',
      'Meal',
      'Stay',
      'Transport',
      'Other',
      'Cancel',
    ];

    const open = (index: number) => {
      if (index === 0) {
        setWizardItem(null);
        setWizardVisible(true);
      } else if (index < 6) {
        setEditingItem(null);
        setModalVisible(true);
      }
      // index === 6 is Cancel — do nothing
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 6, title: 'Add to Itinerary' },
        open,
      );
    } else {
      const buttons: import('react-native').AlertButton[] = [
        ...options.slice(0, -1).map((label, i) => ({
          text: label,
          onPress: () => open(i),
        })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => {} },
      ];
      Alert.alert('Add to Itinerary', undefined, buttons);
    }
  };

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
          const isLast = index === trip.itinerary.length - 1;
          const dotColor = TYPE_DOT_COLOR[item.type] ?? '#A8937F';
          const isArrDep = item.type === 'arrival' || item.type === 'departure';
          const refChip = isArrDep ? getReferenceChip(item) : null;

          // Day label from trip start date
          const dayDate = new Date(trip.startDate);
          dayDate.setDate(dayDate.getDate() + item.day - 1);
          const dayLabel = `Day ${item.day}  ·  ${format(dayDate, 'EEEE  ·  MMM d')}`;

          return (
            <View key={item.id}>
              {showDayHeader && (
                <Text className="text-accent-primary text-xs font-bold tracking-wide uppercase mt-4 mb-3">
                  {dayLabel}
                </Text>
              )}
              <Pressable
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (isArrDep) {
                    setWizardItem(item);
                    setWizardVisible(true);
                  } else {
                    setEditingItem(item);
                    setModalVisible(true);
                  }
                }}
                className="flex-row mb-1"
              >
                {/* Time column */}
                <View className="w-12 items-end pr-2 pt-0.5">
                  {item.time ? (
                    <Text className="text-text-tertiary text-xs">{item.time}</Text>
                  ) : null}
                </View>

                {/* Spine column */}
                <View className="items-center w-5">
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor }} />
                  {!isLast && (
                    <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: '#F0E2D4', marginTop: 2 }} />
                  )}
                </View>

                {/* Content column */}
                <View className="flex-1 pl-3 pb-4">
                  <View className="flex-row items-center flex-wrap gap-1">
                    <Text className="text-text-primary text-[14px] font-semibold">{item.title}</Text>
                    {isArrDep && (
                      <View
                        style={{
                          backgroundColor: item.type === 'arrival' ? '#FFF1E6' : '#EEF4FB',
                          borderRadius: 4,
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: '700',
                            letterSpacing: 0.5,
                            textTransform: 'uppercase',
                            color: item.type === 'arrival' ? '#D4764E' : '#5B8EC9',
                          }}
                        >
                          {item.type}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Detail chips */}
                  <View className="flex-row flex-wrap gap-x-2 mt-0.5">
                    {item.location ? (
                      <Text className="text-text-tertiary text-[11px]">📍 {item.location}</Text>
                    ) : null}
                    {refChip ? (
                      <Text className="text-text-tertiary text-[11px]">🎫 {refChip}</Text>
                    ) : null}
                    {(item.type === 'meal' || item.type === 'activity') && item.cost != null ? (
                      <Text className="text-text-tertiary text-[11px]">💰 ${item.cost}</Text>
                    ) : null}
                  </View>
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
        onPress={handleAddPress}
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
      <ArrivalDepartureWizard
        visible={wizardVisible}
        groupId={groupId}
        initialItem={wizardItem ?? undefined}
        onClose={() => { setWizardVisible(false); setWizardItem(null); }}
      />
    </View>
  );
}
