import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { StayInfoPickerSheet } from './StayInfoPickerSheet';
import type { StayInfo, StayInfoField, StayInfoFieldType } from '../../types';

interface Props {
  groupId: string;
  stayInfo?: StayInfo;
}

const TYPE_ICONS: Record<StayInfoFieldType, string> = {
  wifi:         'wifi',
  door_code:    'key',
  parking:      'car',
  host_contact: 'call',
  custom:       'create-outline',
};

const TYPE_CHIPS: Record<StayInfoFieldType, string> = {
  wifi:         '📶',
  door_code:    '🔑',
  parking:      '🚗',
  host_contact: '📞',
  custom:       '📝',
};

const EMPTY_STAY: StayInfo = { name: '', fields: [] };

function formatDateRange(checkIn?: string, checkOut?: string): string | null {
  if (!checkIn || !checkOut) return null;
  try {
    return `${format(parseISO(checkIn), 'MMM d')} – ${format(parseISO(checkOut), 'MMM d')}`;
  } catch {
    return null;
  }
}

export function StayInfoCard({ groupId, stayInfo }: Props) {
  const isEmpty = !stayInfo;

  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [draft, setDraft] = useState<StayInfo>(stayInfo ?? EMPTY_STAY);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingField, setEditingField] = useState<StayInfoField | null>(null);

  // ── Collapse ─────────────────────────────────
  const collapse = useCallback(() => {
    setExpanded(false);
    setMode('view');
    setRevealed(new Set());
    // Reset draft to persisted value on cancel/collapse
    setDraft(stayInfo ?? EMPTY_STAY);
  }, [stayInfo]);

  // ── Expand ───────────────────────────────────
  const expand = useCallback((initialMode: 'view' | 'edit' = 'view') => {
    setDraft(stayInfo ?? EMPTY_STAY);
    setRevealed(new Set());
    setMode(initialMode);
    setExpanded(true);
    Haptics.selectionAsync();
  }, [stayInfo]);

  // ── Toggle reveal for a masked field ─────────
  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Save ─────────────────────────────────────
  const handleSave = () => {
    if (!draft.name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useGroupsStore.getState().updateStayInfo(groupId, { ...draft, name: draft.name.trim() });
    setExpanded(false);
    setMode('view');
    setRevealed(new Set());
  };

  // ── Picker callbacks ─────────────────────────
  const openPicker = (field?: StayInfoField) => {
    setEditingField(field ?? null);
    setPickerVisible(true);
  };

  const handlePickerSave = (field: StayInfoField) => {
    setPickerVisible(false);
    setDraft((prev) => {
      const exists = prev.fields.some((f) => f.id === field.id);
      return {
        ...prev,
        fields: exists
          ? prev.fields.map((f) => (f.id === field.id ? field : f))
          : [...prev.fields, field],
      };
    });
    setEditingField(null);
  };

  const removeField = (id: string) => {
    setDraft((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== id) }));
  };

  const canSave = draft.name.trim().length > 0;

  // ──────────────────────────────────────────────
  // EMPTY STATE
  // ──────────────────────────────────────────────
  if (isEmpty && !expanded) {
    return (
      <>
        <Pressable
          onPress={() => expand('edit')}
          className="flex-row items-center justify-between px-3 py-3 mx-0 mb-3 rounded-xl border bg-surface-elevated"
          style={{ borderStyle: 'dashed', borderColor: '#E8D5C4' }}
        >
          <View className="flex-row items-center gap-2">
            <View className="w-7 h-7 rounded-lg bg-surface items-center justify-center">
              <Ionicons name="bed-outline" size={15} color="#A8937F" />
            </View>
            <View>
              <Text className="text-text-tertiary text-[13px] font-semibold">Add accommodation</Text>
              <Text className="text-text-tertiary text-[11px] mt-0.5" style={{ opacity: 0.7 }}>Hotel, Airbnb, Wi-Fi, door code…</Text>
            </View>
          </View>
          <Ionicons name="add" size={20} color="#D4764E" />
        </Pressable>
        <StayInfoPickerSheet
          visible={pickerVisible}
          initialField={editingField ?? undefined}
          onSave={handlePickerSave}
          onClose={() => { setPickerVisible(false); setEditingField(null); }}
        />
      </>
    );
  }

  // ──────────────────────────────────────────────
  // COLLAPSED (filled)
  // ──────────────────────────────────────────────
  if (!expanded) {
    const dateRange = formatDateRange(stayInfo?.checkIn, stayInfo?.checkOut);
    return (
      <Pressable
        onPress={() => expand('view')}
        className="flex-row items-center justify-between px-3 py-3 mb-3 rounded-xl border border-border bg-surface-elevated"
      >
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <View className="w-7 h-7 rounded-lg bg-accent-primary/10 items-center justify-center flex-shrink-0">
            <Ionicons name="bed-outline" size={15} color="#D4764E" />
          </View>
          <View className="flex-1">
            <Text className="text-text-primary text-[13px] font-semibold" numberOfLines={1}>
              {stayInfo?.name}
            </Text>
            <View className="flex-row flex-wrap gap-x-2 mt-0.5">
              {stayInfo?.address ? (
                <Text className="text-text-tertiary text-[11px]" numberOfLines={1}>{stayInfo.address}</Text>
              ) : null}
              {dateRange ? (
                <Text className="text-text-tertiary text-[11px]">{dateRange}</Text>
              ) : null}
              {stayInfo?.fields.map((f) => (
                <Text key={f.id} className="text-text-tertiary text-[11px]">
                  {TYPE_CHIPS[f.type]} {f.label}
                </Text>
              ))}
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#A8937F" />
      </Pressable>
    );
  }

  // ──────────────────────────────────────────────
  // EXPANDED (view or edit mode)
  // ──────────────────────────────────────────────
  const data = mode === 'edit' ? draft : (stayInfo ?? EMPTY_STAY);

  return (
    <>
      <View className="mb-3 rounded-xl border border-border bg-surface-elevated overflow-hidden">
        {/* Card header */}
        <View className="flex-row items-center justify-between px-3 py-3 border-b border-border-subtle">
          {mode === 'edit' ? (
            <>
              <Pressable onPress={collapse}>
                <Text className="text-text-tertiary text-[14px]">Cancel</Text>
              </Pressable>
              <Text className="text-text-primary text-[14px] font-bold">
                {isEmpty ? 'Add accommodation' : 'Edit accommodation'}
              </Text>
              <Pressable onPress={handleSave} disabled={!canSave}>
                <Text className="text-[14px] font-semibold" style={{ color: canSave ? '#D4764E' : '#C4B0A2' }}>
                  Save
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View className="flex-row items-center gap-2 flex-1">
                <View className="w-7 h-7 rounded-lg bg-accent-primary/10 items-center justify-center">
                  <Ionicons name="bed-outline" size={15} color="#D4764E" />
                </View>
                <Text className="text-text-primary text-[14px] font-bold flex-1" numberOfLines={1}>
                  {data.name}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Pressable onPress={() => { setDraft(stayInfo ?? EMPTY_STAY); setMode('edit'); }}>
                  <Text className="text-accent-primary text-[13px] font-semibold">Edit</Text>
                </Pressable>
                <Pressable onPress={collapse}>
                  <Ionicons name="chevron-up" size={16} color="#A8937F" />
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* Core fields */}
        {mode === 'edit' ? (
          <View className="px-3 pt-3 pb-1">
            {/* Name */}
            <Text className="text-text-tertiary text-[10px] font-semibold uppercase tracking-wide mb-1">Name *</Text>
            <TextInput
              value={draft.name}
              onChangeText={(v) => setDraft((p) => ({ ...p, name: v }))}
              placeholder="Hotel, Airbnb, villa…"
              placeholderTextColor="#A8937F"
              className="bg-background-primary border border-border rounded-xl px-3 py-2.5 text-text-primary text-[13px] mb-3"
            />
            {/* Address */}
            <Text className="text-text-tertiary text-[10px] font-semibold uppercase tracking-wide mb-1">Address</Text>
            <TextInput
              value={draft.address ?? ''}
              onChangeText={(v) => setDraft((p) => ({ ...p, address: v || undefined }))}
              placeholder="Optional"
              placeholderTextColor="#A8937F"
              className="bg-background-primary border border-border rounded-xl px-3 py-2.5 text-text-primary text-[13px] mb-3"
            />
            {/* Check-in / Check-out row */}
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1">
                <Text className="text-text-tertiary text-[10px] font-semibold uppercase tracking-wide mb-1">Check-in</Text>
                <TextInput
                  value={draft.checkIn ?? ''}
                  onChangeText={(v) => setDraft((p) => ({ ...p, checkIn: v || undefined }))}
                  placeholder="2026-04-01"
                  placeholderTextColor="#A8937F"
                  className="bg-background-primary border border-border rounded-xl px-3 py-2.5 text-text-primary text-[13px]"
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-tertiary text-[10px] font-semibold uppercase tracking-wide mb-1">Check-out</Text>
                <TextInput
                  value={draft.checkOut ?? ''}
                  onChangeText={(v) => setDraft((p) => ({ ...p, checkOut: v || undefined }))}
                  placeholder="2026-04-10"
                  placeholderTextColor="#A8937F"
                  className="bg-background-primary border border-border rounded-xl px-3 py-2.5 text-text-primary text-[13px]"
                />
              </View>
            </View>
          </View>
        ) : (
          <View className="px-3 pt-2 pb-1">
            {data.address ? (
              <View className="flex-row items-start gap-2 py-2 border-b border-border-subtle">
                <Ionicons name="location-outline" size={14} color="#A8937F" style={{ marginTop: 1 }} />
                <Text className="text-text-primary text-[13px] flex-1">{data.address}</Text>
              </View>
            ) : null}
            {(data.checkIn && data.checkOut) ? (
              <View className="flex-row items-center gap-2 py-2 border-b border-border-subtle">
                <Ionicons name="calendar-outline" size={14} color="#A8937F" />
                <Text className="text-text-primary text-[13px]">
                  {formatDateRange(data.checkIn, data.checkOut)}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Extra fields */}
        {data.fields.length > 0 && (
          <View className="px-3 pb-1">
            {data.fields.map((field) => {
              const isRevealed = revealed.has(field.id);
              const showMask = field.masked && !isRevealed;
              return (
                <View
                  key={field.id}
                  className="flex-row items-center py-2.5 border-b border-border-subtle"
                >
                  <Ionicons name={TYPE_ICONS[field.type] as any} size={13} color="#A8937F" style={{ marginRight: 8 }} />
                  <View className="flex-1">
                    <Text className="text-text-tertiary text-[10px] font-semibold uppercase tracking-wide">
                      {field.label}
                    </Text>
                    {field.type === 'wifi' ? (
                      <>
                        <Text className="text-text-primary text-[13px] font-medium">{field.value}</Text>
                        {field.value2 ? (
                          <Text className="text-[13px]" style={{ color: showMask ? '#A8937F' : '#2D1F14' }}>
                            {showMask ? '••••••' : field.value2}
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text className="text-[13px]" style={{ color: showMask ? '#A8937F' : '#2D1F14' }}>
                        {showMask ? '••••••' : field.value}
                      </Text>
                    )}
                  </View>
                  {mode === 'view' && field.masked ? (
                    <Pressable onPress={() => toggleReveal(field.id)} hitSlop={8}>
                      <Ionicons
                        name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
                        size={15}
                        color="#A8937F"
                      />
                    </Pressable>
                  ) : mode === 'edit' ? (
                    <View className="flex-row items-center gap-3">
                      <Pressable onPress={() => openPicker(field)} hitSlop={8}>
                        <Ionicons name="pencil-outline" size={15} color="#A8937F" />
                      </Pressable>
                      <Pressable onPress={() => removeField(field.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={15} color="#C94F4F" />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {/* Add info / view-mode add */}
        <Pressable
          onPress={() => {
            if (mode === 'view') {
              // Switch to edit mode first, then open picker
              setDraft(stayInfo ?? EMPTY_STAY);
              setMode('edit');
              // Small delay to let edit mode render before picker opens
              setTimeout(() => openPicker(), 50);
            } else {
              openPicker();
            }
          }}
          className="flex-row items-center gap-1.5 px-3 py-3"
        >
          <Ionicons name="add-circle-outline" size={16} color="#D4764E" />
          <Text className="text-accent-primary text-[13px] font-semibold">Add info</Text>
        </Pressable>
      </View>

      <StayInfoPickerSheet
        visible={pickerVisible}
        initialField={editingField ?? undefined}
        onSave={handlePickerSave}
        onClose={() => { setPickerVisible(false); setEditingField(null); }}
      />
    </>
  );
}
