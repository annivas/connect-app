import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useShallow } from 'zustand/react/shallow';
import { TravelerPicker } from './TravelerPicker';
import { TransportPicker } from './TransportPicker';
import type { ItineraryItem, Traveler, TransportMethod, TravelDetails } from '../../types';

interface Props {
  visible: boolean;
  groupId: string;
  initialItem?: ItineraryItem;
  onClose: () => void;
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View className="flex-row items-center justify-center gap-1.5 py-2">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i < current ? '#D4764E66' : i === current ? '#D4764E' : '#E8D5C4',
          }}
        />
      ))}
    </View>
  );
}

export function ArrivalDepartureWizard({ visible, groupId, initialItem, onClose }: Props) {
  const isEditing = !!initialItem;

  const [direction, setDirection] = useState<'arrival' | 'departure'>('arrival');
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [transportMethod, setTransportMethod] = useState<TransportMethod | undefined>(undefined);
  const [travelDetails, setTravelDetails] = useState<TravelDetails>({});
  const [day, setDay] = useState(1);
  const [timeStr, setTimeStr] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(isEditing ? 1 : 0);

  const group = useGroupsStore(useShallow((s) => s.getGroupById(groupId)));
  const trip = group?.trip;
  const totalDays = trip
    ? Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 7;

  useEffect(() => {
    if (visible && initialItem) {
      setDirection(initialItem.type as 'arrival' | 'departure');
      setTravelers(initialItem.travelers ?? []);
      setTransportMethod(initialItem.transportMethod);
      setTravelDetails(initialItem.travelDetails ?? {});
      setDay(initialItem.day);
      setTimeStr(initialItem.time ?? '');
      setLocation(initialItem.location ?? '');
      setNotes(initialItem.description ?? '');
      setStep(1);
    } else if (visible && !initialItem) {
      setDirection('arrival');
      setTravelers([]);
      setTransportMethod(undefined);
      setTravelDetails({});
      setDay(1);
      setTimeStr('');
      setLocation('');
      setNotes('');
      setStep(0);
    }
  }, [visible, initialItem]);

  const dotCount = isEditing ? 4 : 5;

  const canAdvanceStep1 = travelers.length > 0;
  const canAdvanceStep2 = !!transportMethod;

  const goBack = () => {
    const minStep = isEditing ? 1 : 0;
    if (step <= minStep) {
      handleClose();
    } else {
      setStep(step - 1);
    }
  };

  const handleClose = () => {
    const hasData = travelers.length > 0 || transportMethod || location || timeStr || notes;
    if (hasData && !isEditing) {
      Alert.alert('Discard changes?', 'You have unsaved changes.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ]);
    } else {
      onClose();
    }
  };

  const buildItem = (): ItineraryItem => ({
    id: initialItem?.id ?? `itin-${Date.now()}`,
    type: direction,
    day,
    time: timeStr.trim() || undefined,
    title: travelers.length === 1
      ? `${travelers[0].name} ${direction}`
      : `${travelers.map((t) => t.name).join(' & ')} ${direction}`,
    location: location.trim() || undefined,
    description: notes.trim() || undefined,
    travelers,
    transportMethod,
    travelDetails: (() => {
  const clean = Object.fromEntries(
    Object.entries(travelDetails).filter(([, v]) => v !== undefined && v !== '' && v !== false)
  ) as TravelDetails;
  return Object.keys(clean).length > 0 ? clean : undefined;
})(),
  });

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const item = buildItem();
    if (isEditing) {
      useGroupsStore.getState().editItineraryItem(groupId, item.id, item);
    } else {
      useGroupsStore.getState().addItineraryItem(groupId, item);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!initialItem) return;
    Alert.alert('Delete item', `Remove this ${direction} from the itinerary?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          useGroupsStore.getState().deleteItineraryItem(groupId, initialItem.id);
          onClose();
        },
      },
    ]);
  };

  const renderHeader = (title: string, nextLabel?: string, onNext?: () => void, nextDisabled?: boolean) => (
    <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-border-subtle">
      <Pressable onPress={goBack} hitSlop={8}>
        <Text className="text-accent-primary text-[15px]">
          {step === (isEditing ? 1 : 0) ? 'Cancel' : '← Back'}
        </Text>
      </Pressable>
      <Text className="text-text-primary text-[17px] font-semibold">{title}</Text>
      {onNext ? (
        <Pressable onPress={onNext} disabled={nextDisabled} hitSlop={8}>
          <Text className={`text-[15px] font-semibold ${nextDisabled ? 'text-text-tertiary' : 'text-accent-primary'}`}>
            {nextLabel ?? 'Next'}
          </Text>
        </Pressable>
      ) : (
        <View style={{ width: 50 }} />
      )}
    </View>
  );

  const renderStep0 = () => (
    <View className="flex-1">
      {renderHeader('Add to Itinerary')}
      <StepDots total={5} current={0} />
      <Text className="text-text-secondary text-sm text-center mt-2 mb-6 px-4">
        Is someone arriving or departing?
      </Text>
      <View className="flex-row gap-4 px-6">
        {(['arrival', 'departure'] as const).map((d) => (
          <Pressable
            key={d}
            onPress={() => { Haptics.selectionAsync(); setDirection(d); setStep(1); }}
            className="flex-1 items-center py-8 rounded-2xl border-2"
            style={{ borderColor: '#D4764E', backgroundColor: '#FFF1E6' }}
          >
            <Text style={{ fontSize: 36 }}>{d === 'arrival' ? '↓' : '↑'}</Text>
            <Text className="text-text-primary text-base font-semibold mt-2 capitalize">{d}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View className="flex-1">
      {renderHeader("Who's traveling?", 'Next', () => setStep(2), !canAdvanceStep1)}
      <StepDots total={dotCount} current={isEditing ? 0 : 1} />
      <TravelerPicker groupId={groupId} selected={travelers} onChange={setTravelers} />
    </View>
  );

  const renderStep2 = () => (
    <View className="flex-1">
      {renderHeader('How are they traveling?', 'Next', () => setStep(3), !canAdvanceStep2)}
      <StepDots total={dotCount} current={isEditing ? 1 : 2} />
      <TransportPicker
        method={transportMethod}
        details={travelDetails}
        onMethodChange={setTransportMethod}
        onDetailsChange={setTravelDetails}
      />
    </View>
  );

  const renderStep3 = () => (
    <View className="flex-1">
      {renderHeader('When & where?', 'Review', () => setStep(4))}
      <StepDots total={dotCount} current={isEditing ? 2 : 3} />
      <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
        {/* Day picker */}
        <Text className="text-text-secondary text-sm font-medium mb-1.5">Day</Text>
        <View className="flex-row flex-wrap mb-4">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
            <Pressable
              key={d}
              onPress={() => { Haptics.selectionAsync(); setDay(d); }}
              className={`w-10 h-10 rounded-full items-center justify-center mr-2 mb-2 ${
                day === d ? 'bg-accent-primary' : 'bg-surface-elevated'
              }`}
            >
              <Text className={`text-sm font-semibold ${day === d ? 'text-white' : 'text-text-secondary'}`}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Time — plain text input (HH:mm) */}
        <Text className="text-text-secondary text-sm font-medium mb-1.5">Time (optional)</Text>
        <TextInput
          value={timeStr}
          onChangeText={setTimeStr}
          placeholder="e.g. 14:30"
          placeholderTextColor="#A8937F"
          keyboardType="numbers-and-punctuation"
          className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-4"
        />

        {/* Location */}
        <Text className="text-text-secondary text-sm font-medium mb-1.5">Location (optional)</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. TFS Airport, Port of Tenerife"
          placeholderTextColor="#A8937F"
          className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-4"
        />

        {/* Notes */}
        <Text className="text-text-secondary text-sm font-medium mb-1.5">Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Any extra details…"
          placeholderTextColor="#A8937F"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-6 min-h-[80px]"
        />
      </ScrollView>
    </View>
  );

  const renderStep4 = () => {
    const rows: { label: string; value: string; goTo: number }[] = [
      { label: 'Travelers', value: travelers.map((t) => t.name).join(', ') || '—', goTo: 1 },
      { label: 'Transport', value: transportMethod ?? '—', goTo: 2 },
      { label: 'Day', value: `Day ${day}`, goTo: 3 },
      { label: 'Time', value: timeStr || '—', goTo: 3 },
      { label: 'Location', value: location || '—', goTo: 3 },
      { label: 'Notes', value: notes || '—', goTo: 3 },
    ];

    return (
      <View className="flex-1">
        {renderHeader(isEditing ? 'Edit' : 'Review')}
        <StepDots total={dotCount} current={isEditing ? 3 : 4} />
        <ScrollView className="flex-1 px-4 pt-3">
          <View className="bg-surface-elevated rounded-2xl overflow-hidden mb-4">
            {rows.map((row, i) => (
              <Pressable
                key={row.label}
                onPress={() => setStep(row.goTo)}
                className={`flex-row items-center px-4 py-3.5 ${i < rows.length - 1 ? 'border-b border-border-subtle' : ''}`}
              >
                <Text className="text-text-secondary text-sm w-24">{row.label}</Text>
                <Text className="flex-1 text-text-primary text-[14px] font-medium">{row.value}</Text>
                <Ionicons name="chevron-forward" size={14} color="#A8937F" />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleSave}
            className="bg-accent-primary rounded-2xl py-4 items-center mb-3"
          >
            <Text className="text-white text-[16px] font-semibold">
              {isEditing ? 'Save Changes' : 'Add to Itinerary'}
            </Text>
          </Pressable>

          {isEditing && (
            <Pressable
              onPress={handleDelete}
              className="bg-surface-elevated rounded-2xl py-4 items-center mb-8"
            >
              <Text className="text-status-error text-[15px] font-medium">Delete</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-background-primary">
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </View>
    </Modal>
  );
}
