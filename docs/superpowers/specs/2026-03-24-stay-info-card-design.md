# Stay Info Card — Design Spec

**Feature:** Trip Info / Stay Info section at the top of the Trip tab
**Date:** 2026-03-24
**Status:** Approved for implementation

---

## Overview

A compact tappable row at the top of the Trip tab that gives group members quick access to accommodation details — hotel name, address, check-in/out dates, and any extra info fields (Wi-Fi, door codes, parking, host contact, custom notes). All fields are optional. Any trip member can edit.

---

## Data Model

### New types in `src/types/index.ts`

```typescript
export type StayInfoFieldType =
  | 'wifi'
  | 'door_code'
  | 'parking'
  | 'host_contact'
  | 'custom';

export interface StayInfoField {
  id: string;
  type: StayInfoFieldType;
  label: string;       // e.g. "Wi-Fi", "Door Code", or user-defined for custom
  value: string;       // network name (wifi), code, note, etc.
  value2?: string;     // wifi password only (wifi type)
  masked?: boolean;    // true by default for wifi (value2) and door_code
}

export interface StayInfo {
  name: string;
  address?: string;
  checkIn?: string;    // ISO date string e.g. "2026-04-01"
  checkOut?: string;
  fields: StayInfoField[];
}
```

### Change to `Trip` in `src/types/index.ts`

Add one optional field:

```typescript
export interface Trip {
  // ... existing fields ...
  stayInfo?: StayInfo;
}
```

---

## Store

### New action in `src/stores/useGroupsStore.ts`

```typescript
updateStayInfo: (groupId: string, stayInfo: StayInfo | undefined) => void;
```

- Optimistic update: immediately update the group's `trip.stayInfo` in local state
- On failure: revert to the previous `stayInfo` value
- Passing `undefined` clears the stay info entirely

---

## Components

### `src/components/groups/StayInfoCard.tsx`

The main component. Mounted in `TripTab` between the destination/date header and the itinerary timeline.

**Props:**
```typescript
interface Props {
  groupId: string;
  stayInfo?: StayInfo;
}
```

**Render states:**

#### 1. Empty state
- Dashed border row, greyed-out icon and text: "Add accommodation"
- Subtitle: "Hotel, Airbnb, Wi-Fi, door code…"
- `+` icon on the right
- Tapping enters **edit mode** directly (no view mode when empty)

#### 2. Collapsed (filled)
- Solid row, hotel icon, accommodation name as title
- Subtitle chips (only for filled fields, in order):
  - Address (plain text, truncated)
  - Date range: "Apr 1 – Apr 10" (if both checkIn + checkOut present)
  - One chip per extra field present: `📶 Wi-Fi`, `🔑 Door code`, `🚗 Parking`, etc.
- Chevron `›` on the right
- Tapping expands to **view mode**

#### 3. Expanded — view mode
- Card header: accommodation name + `Edit` button (top-right)
- Core fields (shown only if filled):
  - `📍` Address
  - `📅` Check-in / Check-out
- Extra fields list: one row per `StayInfoField`
  - Masked fields (`wifi` password, `door_code`): show `••••••` with 👁 tap-to-reveal
  - Unmasked fields: show value directly
- `+ Add info` button at bottom
- Tapping outside the card collapses it back

#### 4. Expanded — edit mode
- Card header: `Cancel` (left) + `Save` (right)
- Core fields become `TextInput`s: name, address, check-in, check-out
- Each extra field row shows:
  - Pencil icon → re-opens picker pre-filled for that field type
  - Trash icon → removes the field (with confirm on delete)
- `+ Add info` button remains, opens the picker sheet
- `Save` calls `updateStayInfo` and returns to collapsed state
- `Cancel` discards all unsaved changes

---

### `src/components/groups/StayInfoPickerSheet.tsx`

A `Modal` (presentation style `pageSheet`) for selecting and entering a new extra field.

**Props:**
```typescript
interface Props {
  visible: boolean;
  initialField?: StayInfoField;   // pre-filled when editing an existing field
  onSave: (field: StayInfoField) => void;
  onClose: () => void;
}
```

**Two internal screens:**

**Screen 1 — Type picker** (skipped when `initialField` is provided):
List of field types with icon + label + short description:
| Icon | Type | Description |
|------|------|-------------|
| 📶 | Wi-Fi | Network name + password (masked) |
| 🔑 | Door / Gate Code | PIN or key code (masked) |
| 🚗 | Parking | Spot number or instructions |
| 📞 | Host Contact | Name + phone / note |
| ✏️ | Custom | Your own label + value |

**Screen 2 — Field editor:**
- Wi-Fi: two inputs — "Network name" + "Password" (masked by default, eye toggle)
- Door/Gate Code: one input — "Code" (masked by default, eye toggle)
- Parking / Host Contact / Custom: label input (pre-filled for non-custom types) + value input
- `Save` → calls `onSave` with a new `StayInfoField` (generates `id` with `Date.now()`)

---

## Flows

### Adding stay info for the first time
1. User sees dashed "Add accommodation" row → taps
2. Card expands in edit mode
3. User fills name, optionally address + dates
4. Taps `+ Add info` → `StayInfoPickerSheet` opens (type picker screen)
5. Picks a type → field editor screen
6. Saves field → sheet closes, field appears in edit mode card
7. User taps `Save` on card → `updateStayInfo` called → card collapses to filled state

### Viewing credentials
1. User taps compact row → card expands in view mode
2. Masked fields show `••••••` with 👁 icon
3. User taps 👁 → value reveals (local state only, resets on next expand)
4. User taps elsewhere → card collapses

### Editing an existing field
1. Expand → tap `Edit` → edit mode
2. Tap pencil next to a field → `StayInfoPickerSheet` opens pre-filled
3. Edit → save → field updates in edit mode card
4. Tap `Save` on card → persisted

### Removing a field
1. Expand → tap `Edit` → edit mode
2. Tap trash icon next to a field → field removed immediately from local edit state
3. Tap `Save` → persisted (or `Cancel` to undo)

---

## TripTab Changes

In `src/components/groups/TripTab.tsx`:
- Import and mount `<StayInfoCard groupId={groupId} stayInfo={trip.stayInfo} />` between the destination/date header block and the itinerary list

---

## Mock Data

Seed `trip-1` in `src/mocks/groups.ts` with a `stayInfo` object:

```typescript
stayInfo: {
  name: 'Shibuya Excel Hotel Tokyu',
  address: '1-12-2 Dogenzaka, Shibuya, Tokyo',
  checkIn: '2026-04-01',
  checkOut: '2026-04-10',
  fields: [
    {
      id: 'sif-1',
      type: 'wifi',
      label: 'Wi-Fi',
      value: 'SHIBUYA_EXCEL_5G',
      value2: 'hotel2026',
      masked: true,
    },
    {
      id: 'sif-2',
      type: 'door_code',
      label: 'Door Code',
      value: '4821',
      masked: true,
    },
  ],
},
```

---

## Styling Notes

- Follows the warm light NativeWind token palette (same as rest of app)
- Empty state: dashed border using `borderStyle: 'dashed'`, `border-border` color, dimmed text
- Masked reveal: local `useState<Set<string>>` tracking which field IDs are revealed; resets when card collapses
- Edit mode inputs: same `TextInput` style as `ItineraryItemModal` and `ArrivalDepartureWizard`
- Haptics: `selectionAsync` on expand/collapse, `impactAsync(Light)` on Save

---

## Out of Scope

- Check-in/check-out time pickers (date string only for now)
- Photo attachments (e.g. photo of door keypad)
- Per-field permission levels (all members see all fields)
- Backend persistence (mock-only, consistent with rest of app)
