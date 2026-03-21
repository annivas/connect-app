import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView, Platform, ActionSheetIOS, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGroupsStore } from '../../stores/useGroupsStore';
import type { StayInfo } from '../../types';

interface Props {
  groupId: string;
  stayInfo?: StayInfo;
}

function Row({ icon, label, value, secret }: { icon: string; label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const display = secret && !revealed ? '••••••••' : value;
  return (
    <View className="flex-row items-start py-2 border-b border-border-subtle">
      <Ionicons name={icon as any} size={14} color="#A8937F" style={{ marginTop: 2, width: 20 }} />
      <View className="flex-1">
        <Text className="text-text-tertiary text-[11px] mb-0.5">{label}</Text>
        <Text className="text-text-primary text-[13px] font-medium">{display}</Text>
      </View>
      {secret && (
        <Pressable onPress={() => setRevealed((r) => !r)} hitSlop={8}>
          <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={16} color="#A8937F" />
        </Pressable>
      )}
    </View>
  );
}

interface EditModalProps {
  visible: boolean;
  initial: StayInfo;
  onSave: (info: StayInfo) => void;
  onClose: () => void;
}

function EditModal({ visible, initial, onSave, onClose }: EditModalProps) {
  const [form, setForm] = useState<StayInfo>(initial);

  const field = (key: keyof StayInfo, label: string, placeholder: string, options?: { secret?: boolean; multiline?: boolean }) => (
    <View className="mb-4">
      <Text className="text-text-secondary text-xs font-semibold mb-1 uppercase tracking-wide">{label}</Text>
      <TextInput
        className="bg-surface rounded-xl px-3 py-2.5 text-text-primary text-[14px]"
        value={form[key] ?? ''}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
        placeholder={placeholder}
        placeholderTextColor="#A8937F"
        secureTextEntry={options?.secret}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 3 : 1}
        style={options?.multiline ? { minHeight: 72, textAlignVertical: 'top' } : undefined}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-border-subtle">
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-accent-primary text-[15px]">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary text-[15px] font-semibold">Stay Info</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSave(form);
              onClose();
            }}
            hitSlop={8}
          >
            <Text className="text-accent-primary text-[15px] font-semibold">Save</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-5" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {field('name', 'Accommodation', 'e.g. Shibuya Excel Hotel')}
          {field('address', 'Address', 'Full address')}

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-text-secondary text-xs font-semibold mb-1 uppercase tracking-wide">Check-in</Text>
              <TextInput
                className="bg-surface rounded-xl px-3 py-2.5 text-text-primary text-[14px]"
                value={form.checkIn ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, checkIn: v }))}
                placeholder="15:00"
                placeholderTextColor="#A8937F"
              />
            </View>
            <View className="flex-1">
              <Text className="text-text-secondary text-xs font-semibold mb-1 uppercase tracking-wide">Check-out</Text>
              <TextInput
                className="bg-surface rounded-xl px-3 py-2.5 text-text-primary text-[14px]"
                value={form.checkOut ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, checkOut: v }))}
                placeholder="11:00"
                placeholderTextColor="#A8937F"
              />
            </View>
          </View>

          {field('wifiName', 'Wi-Fi Network', 'Network name')}
          {field('wifiPassword', 'Wi-Fi Password', 'Password', { secret: true })}
          {field('doorCode', 'Door / Access Code', 'PIN or lockbox code', { secret: true })}
          {field('accessNotes', 'Access Notes', 'Key collection, parking, etc.', { multiline: true })}
          <View className="h-8" />
        </ScrollView>
      </View>
    </Modal>
  );
}

export function TripInfoCard({ groupId, stayInfo }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const info = stayInfo ?? {};
  const hasAny = Object.values(info).some(Boolean);

  return (
    <>
      <View
        className="bg-surface-elevated rounded-2xl mb-4 overflow-hidden"
        style={{ borderWidth: 1, borderColor: '#E8D5C4' }}
      >
        {/* Header row */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setExpanded((e) => !e);
          }}
          className="flex-row items-center px-4 py-3"
        >
          <View className="w-7 h-7 rounded-full items-center justify-center mr-3" style={{ backgroundColor: 'rgba(212, 118, 78, 0.12)' }}>
            <Ionicons name="home-outline" size={14} color="#D4764E" />
          </View>
          <View className="flex-1">
            <Text className="text-text-primary text-[14px] font-semibold">
              {info.name ?? 'Stay Info'}
            </Text>
            {(info.checkIn || info.checkOut) ? (
              <Text className="text-text-tertiary text-[11px] mt-0.5">
                {[info.checkIn && `Check-in ${info.checkIn}`, info.checkOut && `Check-out ${info.checkOut}`]
                  .filter(Boolean).join('  ·  ')}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setEditVisible(true);
            }}
            hitSlop={8}
            className="mr-3"
          >
            <Ionicons name="pencil-outline" size={16} color="#A8937F" />
          </Pressable>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#A8937F"
          />
        </Pressable>

        {/* Expanded content */}
        {expanded && (
          <View className="px-4 pb-3">
            {!hasAny ? (
              <Text className="text-text-tertiary text-[13px] py-2">
                Tap the pencil to add accommodation, Wi-Fi, and access details.
              </Text>
            ) : (
              <>
                {info.address ? <Row icon="location-outline" label="Address" value={info.address} /> : null}
                {info.wifiName ? <Row icon="wifi-outline" label="Wi-Fi" value={info.wifiName} /> : null}
                {info.wifiPassword ? <Row icon="key-outline" label="Wi-Fi Password" value={info.wifiPassword} secret /> : null}
                {info.doorCode ? <Row icon="lock-closed-outline" label="Door Code" value={info.doorCode} secret /> : null}
                {info.accessNotes ? <Row icon="information-circle-outline" label="Access Notes" value={info.accessNotes} /> : null}
              </>
            )}
          </View>
        )}
      </View>

      <EditModal
        visible={editVisible}
        initial={info}
        onSave={(updated) => useGroupsStore.getState().updateStayInfo(groupId, updated)}
        onClose={() => setEditVisible(false)}
      />
    </>
  );
}
