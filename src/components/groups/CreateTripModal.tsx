import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useToastStore } from '../../stores/useToastStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (trip: { destination: string; startDate: Date; endDate: Date; budget?: number }) => void;
}

export function CreateTripModal({ visible, onClose, onSave }: Props) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');

  useEffect(() => {
    if (visible) {
      setDestination('');
      setStartDate('');
      setEndDate('');
      setBudget('');
    }
  }, [visible]);

  const handleSave = () => {
    if (!destination.trim()) {
      useToastStore.getState().show({ message: 'Please enter a destination.', type: 'warning' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      useToastStore.getState().show({ message: 'Please enter valid dates (YYYY-MM-DD).', type: 'warning' });
      return;
    }

    if (end <= start) {
      useToastStore.getState().show({ message: 'End date must be after start date.', type: 'warning' });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave({
      destination: destination.trim(),
      startDate: start,
      endDate: end,
      budget: budget.trim() ? Number(budget) : undefined,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView className="flex-1 bg-background-primary" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle">
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-accent-primary text-[15px]">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary text-[17px] font-semibold">
            Plan a Trip
          </Text>
          <Pressable onPress={handleSave} hitSlop={8}>
            <Text className="text-accent-primary text-[15px] font-semibold">Create</Text>
          </Pressable>
        </View>

        <View className="px-4 pt-6">
          {/* Hero icon */}
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-accent-primary/15 items-center justify-center">
              <Ionicons name="airplane" size={32} color="#D4764E" />
            </View>
          </View>

          {/* Destination */}
          <Text className="text-text-secondary text-sm font-medium mb-1.5">Destination</Text>
          <TextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g. Tokyo, Japan"
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-4"
            autoFocus
          />

          {/* Start Date */}
          <Text className="text-text-secondary text-sm font-medium mb-1.5">Start Date</Text>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-4"
          />

          {/* End Date */}
          <Text className="text-text-secondary text-sm font-medium mb-1.5">End Date</Text>
          <TextInput
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-4"
          />

          {/* Budget */}
          <Text className="text-text-secondary text-sm font-medium mb-1.5">Budget (optional)</Text>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            placeholder="0"
            placeholderTextColor="#A8937F"
            keyboardType="numeric"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-6"
          />
        </View>
      </ScrollView>
    </Modal>
  );
}
