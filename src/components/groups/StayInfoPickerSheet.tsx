import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, Pressable, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { StayInfoField, StayInfoFieldType } from '../../types';

interface Props {
  visible: boolean;
  initialField?: StayInfoField;
  onSave: (field: StayInfoField) => void;
  onClose: () => void;
}

const FIELD_CATALOG: {
  type: StayInfoFieldType;
  icon: string;
  label: string;
  description: string;
}[] = [
  { type: 'wifi',         icon: 'wifi',           label: 'Wi-Fi',            description: 'Network name + password (masked)' },
  { type: 'door_code',    icon: 'key',            label: 'Door / Gate Code', description: 'PIN or key code (masked)' },
  { type: 'parking',      icon: 'car',            label: 'Parking',          description: 'Spot number or instructions' },
  { type: 'host_contact', icon: 'call',           label: 'Host Contact',     description: 'Name + phone / note' },
  { type: 'custom',       icon: 'create-outline', label: 'Custom',           description: 'Your own label + value' },
];

const DEFAULT_LABELS: Record<StayInfoFieldType, string> = {
  wifi:         'Wi-Fi',
  door_code:    'Door Code',
  parking:      'Parking',
  host_contact: 'Host Contact',
  custom:       '',
};

function generateId(): string {
  return `sif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function StayInfoPickerSheet({ visible, initialField, onSave, onClose }: Props) {
  const isEditing = !!initialField;

  const [screen, setScreen] = useState<'picker' | 'editor'>('picker');
  const [selectedType, setSelectedType] = useState<StayInfoFieldType>('wifi');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (isEditing && initialField) {
      setSelectedType(initialField.type);
      setLabel(initialField.label);
      setValue(initialField.value);
      setValue2(initialField.value2 ?? '');
      setShowSecret(false); // always start masked on edit re-open
      setScreen('editor');
    } else {
      setScreen('picker');
      setLabel('');
      setValue('');
      setValue2('');
      setShowSecret(false);
    }
  }, [visible, isEditing, initialField]);

  const selectType = (type: StayInfoFieldType) => {
    Haptics.selectionAsync();
    setSelectedType(type);
    setLabel(DEFAULT_LABELS[type]);
    setValue('');
    setValue2('');
    setShowSecret(false);
    setScreen('editor');
  };

  const handleSave = () => {
    const trimmedLabel = label.trim();
    const trimmedValue = value.trim();
    if (!trimmedLabel || !trimmedValue) return;

    const masked = selectedType === 'wifi' || selectedType === 'door_code' ? true : undefined;

    const field: StayInfoField = {
      id: isEditing ? initialField!.id : generateId(),
      type: selectedType,
      label: trimmedLabel,
      value: trimmedValue,
      ...(selectedType === 'wifi' && value2.trim() ? { value2: value2.trim() } : {}),
      ...(masked !== undefined ? { masked } : {}),
    };

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave(field);
  };

  const canSave = label.trim().length > 0 && value.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border">
          <Pressable onPress={screen === 'editor' && !isEditing ? () => setScreen('picker') : onClose}>
            <Text className="text-accent-primary text-[15px]">
              {screen === 'editor' && !isEditing ? '← Back' : 'Cancel'}
            </Text>
          </Pressable>
          <Text className="text-text-primary text-[16px] font-bold">
            {screen === 'picker' ? 'Add info' : isEditing ? 'Edit field' : 'Add field'}
          </Text>
          {screen === 'editor' ? (
            <Pressable onPress={handleSave} disabled={!canSave}>
              <Text className={`text-[15px] font-semibold ${canSave ? 'text-accent-primary' : 'text-text-tertiary'}`}>
                Save
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>

        {/* Screen 1 — Type picker */}
        {screen === 'picker' && (
          <ScrollView className="flex-1">
            {FIELD_CATALOG.map((item) => (
              <Pressable
                key={item.type}
                onPress={() => selectType(item.type)}
                className="flex-row items-center px-4 py-3 border-b border-border-subtle"
              >
                <View className="w-9 h-9 rounded-xl bg-accent-primary/10 items-center justify-center mr-3">
                  <Ionicons name={item.icon as any} size={18} color="#D4764E" />
                </View>
                <View className="flex-1">
                  <Text className="text-text-primary text-[14px] font-semibold">{item.label}</Text>
                  <Text className="text-text-tertiary text-[12px] mt-0.5">{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#A8937F" />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Screen 2 — Field editor */}
        {screen === 'editor' && (
          <ScrollView className="flex-1 px-4 pt-4">
            {/* Label — editable for all types */}
            <Text className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wide mb-1">
              Label
            </Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Wi-Fi"
              placeholderTextColor="#A8937F"
              className="bg-surface-elevated border border-border rounded-xl px-3 py-3 text-text-primary text-[14px] mb-4"
            />

            {/* Wi-Fi: two value fields */}
            {selectedType === 'wifi' ? (
              <>
                <Text className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wide mb-1">
                  Network name
                </Text>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder="e.g. HotelGuest_5G"
                  placeholderTextColor="#A8937F"
                  autoCapitalize="none"
                  className="bg-surface-elevated border border-border rounded-xl px-3 py-3 text-text-primary text-[14px] mb-4"
                />
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wide">
                    Password
                  </Text>
                  <Pressable onPress={() => setShowSecret((v) => !v)}>
                    <Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={16} color="#A8937F" />
                  </Pressable>
                </View>
                <TextInput
                  value={value2}
                  onChangeText={setValue2}
                  placeholder="Optional"
                  placeholderTextColor="#A8937F"
                  secureTextEntry={!showSecret}
                  autoCapitalize="none"
                  className="bg-surface-elevated border border-border rounded-xl px-3 py-3 text-text-primary text-[14px] mb-4"
                />
              </>
            ) : selectedType === 'door_code' ? (
              <>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wide">
                    Code
                  </Text>
                  <Pressable onPress={() => setShowSecret((v) => !v)}>
                    <Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={16} color="#A8937F" />
                  </Pressable>
                </View>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder="e.g. 4821"
                  placeholderTextColor="#A8937F"
                  secureTextEntry={!showSecret}
                  keyboardType="default"
                  className="bg-surface-elevated border border-border rounded-xl px-3 py-3 text-text-primary text-[14px] mb-4"
                />
              </>
            ) : (
              <>
                <Text className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wide mb-1">
                  Value
                </Text>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder={
                    selectedType === 'parking' ? 'e.g. Level B2, spot 14' :
                    selectedType === 'host_contact' ? 'e.g. +1 555 0123' :
                    'Enter value'
                  }
                  placeholderTextColor="#A8937F"
                  multiline={selectedType === 'custom'}
                  numberOfLines={selectedType === 'custom' ? 3 : 1}
                  className="bg-surface-elevated border border-border rounded-xl px-3 py-3 text-text-primary text-[14px] mb-4"
                />
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
