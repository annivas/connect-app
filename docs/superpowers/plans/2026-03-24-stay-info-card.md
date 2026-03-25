# Stay Info Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible Stay Info card at the top of the Trip tab that lets trip members view and edit accommodation details (name, address, check-in/out, and flexible extra fields like Wi-Fi, door codes, parking).

**Architecture:** Seven sequential tasks — types → repository → store → mock data → picker sheet component → card component → mount. Each task is independently committable and type-checks cleanly before the next begins.

**Tech Stack:** React Native 0.81.5, Expo SDK 54, TypeScript, NativeWind v4, Zustand v5, `@expo/vector-icons` (Ionicons), `expo-haptics`, `date-fns`

---

## File Map

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `StayInfoFieldType`, `StayInfoField`, `StayInfo`; extend `Trip` with `stayInfo?` |
| `src/services/types.ts` | Add `updateStayInfo` to `IGroupsRepository`; import `StayInfo` |
| `src/services/mock/groupsRepository.ts` | Add no-op `updateStayInfo` stub |
| `src/services/supabase/groupsRepository.ts` | Add no-op `updateStayInfo` stub |
| `src/stores/useGroupsStore.ts` | Add `updateStayInfo` action + import `StayInfo` |
| `src/mocks/groups.ts` | Seed `stayInfo` on group-2's trip |
| `src/components/groups/StayInfoPickerSheet.tsx` | New: type-picker + field-editor modal |
| `src/components/groups/StayInfoCard.tsx` | New: inline collapsible card (4 states) |
| `src/components/groups/TripTab.tsx` | Mount `StayInfoCard` between header and timeline |

---

## Task 1 — Types

**Files:**
- Modify: `src/types/index.ts` (around line 467, before the `Trip` interface)

- [ ] **Step 1: Add the three new type declarations**

Open `src/types/index.ts`. Find the line `export interface Trip {` (currently around line 468). Insert the following block **immediately above it**:

```typescript
// ─── Stay Info ───────────────────────────────
export type StayInfoFieldType =
  | 'wifi'
  | 'door_code'
  | 'parking'
  | 'host_contact'
  | 'custom';

export interface StayInfoField {
  id: string;
  type: StayInfoFieldType;
  label: string;       // "Wi-Fi", "Door Code", or user-defined for custom
  value: string;       // network name (wifi), code, note, etc.
  value2?: string;     // wifi password only (wifi type)
  masked?: boolean;    // true for wifi (value2) and door_code by default
}

export interface StayInfo {
  name: string;        // required; Save is disabled until non-empty
  address?: string;
  checkIn?: string;    // ISO date e.g. "2026-04-01"
  checkOut?: string;
  fields: StayInfoField[];
}
```

- [ ] **Step 2: Extend the `Trip` interface**

In the same file, add `stayInfo?: StayInfo;` to the `Trip` interface so it reads:

```typescript
export interface Trip {
  id: string;
  groupId: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  itinerary: ItineraryItem[];
  budget?: number;
  participants: string[];
  stayInfo?: StayInfo;
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/pavloskariotis/Desktop/ClaudeCode/Connect && npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no new errors (there may be pre-existing unrelated errors in `InsightsTab.tsx`, `events.tsx`, `reminders.tsx`, `profile.tsx` — those are pre-existing and can be ignored).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add StayInfoFieldType, StayInfoField, StayInfo; extend Trip"
```

---

## Task 2 — Repository Layer

**Files:**
- Modify: `src/services/types.ts`
- Modify: `src/services/mock/groupsRepository.ts`
- Modify: `src/services/supabase/groupsRepository.ts`

- [ ] **Step 1: Add `StayInfo` to the import in `src/services/types.ts`**

Line 1 of `src/services/types.ts` currently ends with `..., Trip, Channel } from '../types';`. Replace the entire line with:

```typescript
import { Conversation, Message, MessageType, Group, GroupType, User, Collection, Note, NoteBlock, Reminder, LedgerEntry, RSVPStatus, SharedObject, SharedObjectType, Poll, DisappearingDuration, ItineraryItem, GroupEvent, Trip, Channel, StayInfo } from '../types';
```

- [ ] **Step 2: Add `updateStayInfo` to `IGroupsRepository`**

In `src/services/types.ts`, find the `// Trips` section inside `IGroupsRepository` (around line 149–150). The `// Trips` section currently contains only `createTrip`. Add `updateStayInfo` directly after it, **before** the `// Itinerary` comment:

```typescript
  // Trips
  createTrip(groupId: string, trip: Omit<Trip, 'id' | 'groupId' | 'itinerary' | 'participants'>): Promise<Trip>;
  updateStayInfo(tripId: string, stayInfo: StayInfo | undefined): Promise<void>;

  // Itinerary
  addItineraryItem(tripId: string, item: Omit<ItineraryItem, 'id'>): Promise<ItineraryItem>;
```

- [ ] **Step 3: Add no-op stub to mock repository**

In `src/services/mock/groupsRepository.ts`, add the stub just before the closing `};` of the exported object (after `deleteChannel`):

```typescript
  async updateStayInfo(_tripId: string, _stayInfo: StayInfo | undefined): Promise<void> {
    // no-op — mock-only app
  },
```

Also add `StayInfo` to the import at the top of this file. The import currently reads something like:
```typescript
import { ... } from '../../types';
```
Add `StayInfo` to it.

- [ ] **Step 4: Add no-op stub to Supabase repository**

In `src/services/supabase/groupsRepository.ts`, add the stub just before the closing `};` of the exported object (after `deleteChannel`):

```typescript
  async updateStayInfo(_tripId: string, _stayInfo: StayInfo | undefined): Promise<void> {
    // no-op stub — stay info persistence not yet implemented
  },
```

Also add `StayInfo` to the import from `'../../types'` at the top of this file.

- [ ] **Step 5: Type-check**

```bash
cd /Users/pavloskariotis/Desktop/ClaudeCode/Connect && npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/types.ts src/services/mock/groupsRepository.ts src/services/supabase/groupsRepository.ts
git commit -m "feat(repository): add updateStayInfo to IGroupsRepository and stubs"
```

---

## Task 3 — Store Action

**Files:**
- Modify: `src/stores/useGroupsStore.ts`

- [ ] **Step 1: Add `StayInfo` to the store's imports**

Line 2 currently imports named types from `'../types'`. Add `StayInfo` to that import list:

```typescript
import { Group, Message, RSVPStatus, Poll, PollOption, Note, Reminder, LedgerEntry, SharedObject, DisappearingDuration, ScheduledMessage, GroupPairBalance, Channel, ConversationMetadata, GroupMetadata, StayInfo } from '../types';
```

- [ ] **Step 2: Add `updateStayInfo` to the `GroupsState` interface**

Find the `GroupsState` interface (around line 36). Add the action signature alongside the other trip-related actions (`createTrip`, `addItineraryItem`, etc.):

```typescript
updateStayInfo: (groupId: string, stayInfo: StayInfo | undefined) => void;
```

- [ ] **Step 3: Implement `updateStayInfo` in the store body**

Find the `createTrip` implementation (around line 957). Add the new action directly after `deleteItineraryItem`'s closing brace:

```typescript
updateStayInfo: (groupId, stayInfo) => {
  const group = get().groups.find((g) => g.id === groupId);
  if (!group?.trip) return;

  const previousStayInfo = group.trip.stayInfo;

  set((state) => ({
    groups: state.groups.map((g) => {
      if (g.id !== groupId || !g.trip) return g;
      return { ...g, trip: { ...g.trip, stayInfo } };
    }),
  }));

  groupsRepository.updateStayInfo(group.trip.id, stayInfo).catch(() => {
    set((state) => ({
      groups: state.groups.map((g) => {
        if (g.id !== groupId || !g.trip) return g;
        return { ...g, trip: { ...g.trip, stayInfo: previousStayInfo } };
      }),
    }));
  });
},
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/pavloskariotis/Desktop/ClaudeCode/Connect && npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/stores/useGroupsStore.ts
git commit -m "feat(store): add updateStayInfo action with optimistic update and rollback"
```

---

## Task 4 — Mock Data

**Files:**
- Modify: `src/mocks/groups.ts`

- [ ] **Step 1: Add `StayInfo` to the mock import**

Line 1 of `src/mocks/groups.ts` imports from `'../types'`. Add `StayInfo` to it:

```typescript
import { Group, SharedObject, Reminder, LedgerEntry, Note, CallEntry, Channel, StayInfo } from '../types';
```

- [ ] **Step 2: Add `stayInfo` to group-2's trip object**

Find the `trip` object inside `group-2` (around line 423). After the `itinerary: [ ... ],` closing bracket, add:

```typescript
      stayInfo: {
        name: 'Shibuya Excel Hotel Tokyu',
        address: '1-12-2 Dogenzaka, Shibuya, Tokyo',
        checkIn: '2026-04-01',
        checkOut: '2026-04-10',
        fields: [
          {
            id: 'sif-1',
            type: 'wifi' as const,
            label: 'Wi-Fi',
            value: 'SHIBUYA_EXCEL_5G',
            value2: 'hotel2026',
            masked: true,
          },
          {
            id: 'sif-2',
            type: 'door_code' as const,
            label: 'Door Code',
            value: '4821',
            masked: true,
          },
        ],
      } satisfies StayInfo,
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/pavloskariotis/Desktop/ClaudeCode/Connect && npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/mocks/groups.ts
git commit -m "feat(mocks): seed stayInfo on Tokyo trip (group-2)"
```

---

## Task 5 — StayInfoPickerSheet Component

**Files:**
- Create: `src/components/groups/StayInfoPickerSheet.tsx`

This is a `Modal` with two internal screens:
- **Screen `'picker'`** — list of field types to choose from (skipped when editing an existing field)
- **Screen `'editor'`** — inputs for the chosen field type

- [ ] **Step 1: Create the file**

```typescript
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
  { type: 'wifi',         icon: 'wifi',              label: 'Wi-Fi',            description: 'Network name + password (masked)' },
  { type: 'door_code',    icon: 'key',               label: 'Door / Gate Code', description: 'PIN or key code (masked)' },
  { type: 'parking',      icon: 'car',               label: 'Parking',          description: 'Spot number or instructions' },
  { type: 'host_contact', icon: 'call',              label: 'Host Contact',     description: 'Name + phone / note' },
  { type: 'custom',       icon: 'create-outline',    label: 'Custom',           description: 'Your own label + value' },
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
  const [showValue2, setShowValue2] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (isEditing && initialField) {
      setSelectedType(initialField.type);
      setLabel(initialField.label);
      setValue(initialField.value);
      setValue2(initialField.value2 ?? '');
      setShowValue2(false); // always start masked on edit re-open
      setScreen('editor');
    } else {
      setScreen('picker');
      setLabel('');
      setValue('');
      setValue2('');
      setShowValue2(false);
    }
  }, [visible, isEditing, initialField]);

  const selectType = (type: StayInfoFieldType) => {
    Haptics.selectionAsync();
    setSelectedType(type);
    setLabel(DEFAULT_LABELS[type]);
    setValue('');
    setValue2('');
    setShowValue2(false);
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
              <Text
                className="text-[15px] font-semibold"
                style={{ color: canSave ? '#D4764E' : '#C4B0A2' }}
              >
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
                  <Pressable onPress={() => setShowValue2((v) => !v)}>
                    <Ionicons name={showValue2 ? 'eye-off-outline' : 'eye-outline'} size={16} color="#A8937F" />
                  </Pressable>
                </View>
                <TextInput
                  value={value2}
                  onChangeText={setValue2}
                  placeholder="Optional"
                  placeholderTextColor="#A8937F"
                  secureTextEntry={!showValue2}
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
                  <Pressable onPress={() => setShowValue2((v) => !v)}>
                    <Ionicons name={showValue2 ? 'eye-off-outline' : 'eye-outline'} size={16} color="#A8937F" />
                  </Pressable>
                </View>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder="e.g. 4821"
                  placeholderTextColor="#A8937F"
                  secureTextEntry={!showValue2}
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
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/pavloskariotis/Desktop/ClaudeCode/Connect && npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/groups/StayInfoPickerSheet.tsx
git commit -m "feat(components): add StayInfoPickerSheet — type catalog + field editor"
```

---

## Task 6 — StayInfoCard Component

**Files:**
- Create: `src/components/groups/StayInfoCard.tsx`

This is the main inline card with 4 states: empty, collapsed, expanded-view, expanded-edit.

Key internal state:
- `expanded: boolean` — whether the card is open
- `mode: 'view' | 'edit'` — only meaningful when expanded
- `draft: StayInfo` — local editable copy, only committed on Save
- `revealed: Set<string>` — which field IDs have had their mask toggled off (resets on collapse)
- `pickerVisible: boolean` + `editingField: StayInfoField | null` — picker sheet control

- [ ] **Step 1: Create the file**

```typescript
import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, Alert,
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
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/pavloskariotis/Desktop/ClaudeCode/Connect && npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/groups/StayInfoCard.tsx
git commit -m "feat(components): add StayInfoCard — 4-state inline accommodation card"
```

---

## Task 7 — Mount in TripTab

**Files:**
- Modify: `src/components/groups/TripTab.tsx`

- [ ] **Step 1: Add the import**

At the top of `src/components/groups/TripTab.tsx`, add the `StayInfoCard` import alongside the other component imports:

```typescript
import { StayInfoCard } from './StayInfoCard';
```

- [ ] **Step 2: Mount the component**

In `TripTab.tsx`, find the closing `</View>` of the destination/date header block (around line 128 — the `<View className="mb-4">` block that shows `{trip.destination}` and the date range). Insert `<StayInfoCard>` immediately **after** that closing `</View>` and **before** the `{trip.itinerary.map(...)}` call. The result should look like:

```tsx
        {/* Destination header */}
        <View className="mb-4">
          <Text className="text-text-primary text-xl font-bold">{trip.destination}</Text>
          <Text className="text-text-secondary text-sm mt-1">
            {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
          </Text>
        </View>

        {/* Stay info card — NEW */}
        <StayInfoCard groupId={groupId} stayInfo={trip.stayInfo} />

        {/* Itinerary timeline — existing, unchanged */}
        {trip.itinerary.map((item, index) => {
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/pavloskariotis/Desktop/ClaudeCode/Connect && npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/groups/TripTab.tsx
git commit -m "feat(trip): mount StayInfoCard at top of trip screen"
```

---

## Final Verification

- [ ] Full type-check passes (ignoring pre-existing errors):
```bash
cd /Users/pavloskariotis/Desktop/ClaudeCode/Connect && npx tsc --noEmit 2>&1 | grep -E "error TS"
```

- [ ] Run the app and verify on the Tokyo 2026 group:
  1. Trip tab shows compact accommodation row with "Shibuya Excel Hotel Tokyu", address, date range, 📶 Wi-Fi and 🔑 Door code chips
  2. Tapping the row expands it in view mode; Wi-Fi password and door code show masked
  3. Tapping 👁 reveals the value
  4. Tapping Edit switches to edit mode; pencil and trash icons appear per field
  5. Tapping trash removes a field from local state; Cancel restores it
  6. Tapping `+ Add info` in view mode switches to edit and opens picker sheet
  7. Picker sheet shows 5 catalog items; picking one goes to field editor
  8. Saving a new field adds it to the card; tapping card Save persists it
  9. A group with no stayInfo shows the dashed "Add accommodation" row

```bash
npx expo start --ios
```
