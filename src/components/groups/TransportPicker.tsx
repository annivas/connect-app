import React from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Switch } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { TransportMethod, TravelDetails } from '../../types';

const METHODS: { key: TransportMethod; label: string; icon: string }[] = [
  { key: 'airplane', label: 'Airplane', icon: '✈️' },
  { key: 'car',      label: 'Car',      icon: '🚗' },
  { key: 'ferry',    label: 'Ferry',    icon: '⛴️' },
  { key: 'train',    label: 'Train',    icon: '🚂' },
  { key: 'bus',      label: 'Bus',      icon: '🚌' },
  { key: 'taxi',     label: 'Taxi',     icon: '🚕' },
  { key: 'other',    label: 'Other',    icon: '···' },
];

interface Props {
  method: TransportMethod | undefined;
  details: TravelDetails;
  onMethodChange: (m: TransportMethod) => void;
  onDetailsChange: (d: TravelDetails) => void;
}

function Field({
  label, value, onChangeText, placeholder, multiline,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean;
}) {
  return (
    <View className="mb-3">
      <Text className="text-text-secondary text-xs font-semibold mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A8937F"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`bg-surface rounded-xl px-3 py-2.5 text-text-primary text-[14px] ${multiline ? 'min-h-[72px]' : ''}`}
      />
    </View>
  );
}

export function TransportPicker({ method, details, onMethodChange, onDetailsChange }: Props) {
  const set = (partial: Partial<TravelDetails>) =>
    onDetailsChange({ ...details, ...partial });

  return (
    <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
      {/* Pill row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="py-3 -mx-4 px-4"
        contentContainerStyle={{ gap: 8 }}
      >
        {METHODS.map((m) => {
          const active = method === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => { Haptics.selectionAsync(); onMethodChange(m.key); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: active ? '#D4764E' : '#E8D5C4',
                backgroundColor: active ? '#FFF1E6' : '#FFFFFF',
              }}
            >
              <Text style={{ fontSize: 16 }}>{m.icon}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#D4764E' : '#7A6355' }}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Contextual fields */}
      {method === 'airplane' && (
        <>
          <Field label="Flight Number" value={details.flightNumber ?? ''} onChangeText={(v) => set({ flightNumber: v })} placeholder="e.g. IB1545" />
          <Field label="Airline" value={details.airline ?? ''} onChangeText={(v) => set({ airline: v })} placeholder="e.g. Iberia" />
          <Field label="Airport / Terminal" value={details.portOrStation ?? ''} onChangeText={(v) => set({ portOrStation: v })} placeholder="e.g. TFS Terminal 1" />
          <Field label="Terminal" value={details.terminal ?? ''} onChangeText={(v) => set({ terminal: v })} placeholder="e.g. T2" />
        </>
      )}
      {method === 'ferry' && (
        <>
          <Field label="Ferry Company" value={details.ferryCompany ?? ''} onChangeText={(v) => set({ ferryCompany: v })} placeholder="e.g. Fred Olsen" />
          <Field label="Port" value={details.portOrStation ?? ''} onChangeText={(v) => set({ portOrStation: v })} placeholder="e.g. Port of Tenerife" />
          <View className="flex-row items-center justify-between bg-surface rounded-xl px-3 py-3 mb-3">
            <Text className="text-text-primary text-[14px]">🚗 Bringing a car on board</Text>
            <Switch
              value={details.carOnFerry ?? false}
              onValueChange={(v) => { Haptics.selectionAsync(); set({ carOnFerry: v }); }}
              trackColor={{ true: '#D4764E', false: '#E8D5C4' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </>
      )}
      {method === 'train' && (
        <>
          <Field label="Train Number" value={details.trainNumber ?? ''} onChangeText={(v) => set({ trainNumber: v })} placeholder="e.g. AVE 3141" />
          <Field label="Station" value={details.portOrStation ?? ''} onChangeText={(v) => set({ portOrStation: v })} placeholder="e.g. Atocha" />
        </>
      )}
      {method === 'car' && (
        <Field label="Pickup Note" value={details.pickupNote ?? ''} onChangeText={(v) => set({ pickupNote: v })} placeholder="e.g. Rental car pickup at arrivals hall" multiline />
      )}
      {method === 'bus' && (
        <Field label="Bus Company / Line" value={details.busLine ?? ''} onChangeText={(v) => set({ busLine: v })} placeholder="e.g. National Express" />
      )}
      {method === 'taxi' && (
        <Field label="Pickup Note" value={details.pickupNote ?? ''} onChangeText={(v) => set({ pickupNote: v })} placeholder="e.g. Pre-booked transfer" multiline />
      )}
      {method === 'other' && (
        <Field label="Notes" value={details.notes ?? ''} onChangeText={(v) => set({ notes: v })} placeholder="Describe how you're getting there…" multiline />
      )}
    </ScrollView>
  );
}
