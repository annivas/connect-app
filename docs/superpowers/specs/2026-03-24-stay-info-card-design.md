# Stay Info Card — Design Spec

**Feature:** Trip Info / Stay Info section at the top of the Trip tab
**Date:** 2026-03-24
**Status:** Approved for implementation

---

## Overview

A compact tappable row at the top of the Trip tab that gives group members quick access to accommodation details — hotel name, address, check-in/out dates, and any extra info fields (Wi-Fi, door codes, parking, host contact, custom notes). All fields except `name` are optional. Any trip member can edit.

---

## Data Model

### New types in `src/types/index.ts`

Add `StayInfoFieldType`, `StayInfoField`, and `StayInfo` **above** the existing `Trip` interface (since `Trip` will reference `StayInfo`).

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
  name: string;        // required; Save is disabled until this is non-empty
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

- **Guard:** action is a no-op if `group.trip` is `undefined`
- **Snapshot:** capture `previousStayInfo = group.trip.stayInfo` **before** the optimistic `set()` call
- **Optimistic update:** immediately write `stayInfo` to `group.trip.stayInfo` in local state
- **Repository call:** `groupsRepository.updateStayInfo(trip.id, stayInfo)` — follows the same pattern as other trip actions.
- **Repository interface:** add `updateStayInfo(tripId: string, stayInfo: StayInfo | undefined): Promise<void>` to `IGroupsRepository` in `src/services/types.ts`.
- **Repository stubs:** add `async updateStayInfo(_tripId: string, _stayInfo: StayInfo | undefined) {}` to both `src/services/mock/groupsRepository.ts` and `src/services/supabase/groupsRepository.ts` (no-op stubs — mock-only app).
- **Store import:** add `StayInfo` to the named imports from `../types` at the top of `useGroupsStore.ts`.
- **On failure:** in `.catch()`, revert `group.trip.stayInfo` to `previousStayInfo`
- Passing `undefined` clears the stay info entirely

Field IDs are generated as `` `sif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` `` to avoid collisions on rapid adds.

---

## Components

### `src/components/groups/StayInfoCard.tsx`

The main component. Mounted **inside the `trip !== undefined` branch** of `TripTab`, between the destination/date header and the itinerary timeline.

Local edit state is ephemeral — unmounting the card (e.g. navigating away mid-edit) discards unsaved changes. This is consistent with the rest of the app.

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
  - Date range: "Apr 1 – Apr 10" only if **both** `checkIn` and `checkOut` are non-empty; omit the chip entirely if only one is set
  - One chip per extra field present, using the icon for `field.type` (not `field.label`) and `field.label` as the chip text — e.g. `📶 Wi-Fi`, `🔑 Door code`, `🚗 Parking`
- Chevron `›` on the right
- Tapping expands to **view mode**

#### 3. Expanded — view mode
- Card header: accommodation name + `Edit` button (top-right)
- Core fields (shown only if filled):
  - `📍` Address
  - `📅` Check-in / Check-out
- Extra fields list: one row per `StayInfoField`
  - Masked fields (`wifi` value2, `door_code` value): show `••••••` with 👁 tap-to-reveal
  - Unmasked fields: show value directly
  - Reveal state is local (`useState<Set<string>>` keyed by field ID) and resets each time the card collapses. It **persists** across view ↔ edit mode transitions within the same expand session (no reset on mode change).
- `+ Add info` button at bottom — tapping this button **switches the card to edit mode first**, then immediately opens `StayInfoPickerSheet`. This ensures all saves go through the edit-mode `name` validation guard.
- Tapping outside the card collapses it back

#### 4. Expanded — edit mode
- Card header: `Cancel` (left) + `Save` (right, disabled until `name` is non-empty)
- Core fields become `TextInput`s: name (required), address, check-in, check-out
- Each extra field row shows:
  - Pencil icon → re-opens `StayInfoPickerSheet` pre-filled for that field (type cannot be changed during edit; user must delete and re-add to change type)
  - Trash icon → removes the field immediately from local edit state (no confirmation — `Cancel` recovers it)
- `+ Add info` button remains, opens the picker sheet
- `Save` calls `updateStayInfo` and returns to collapsed state
- `Cancel` discards all local edit state

---

### `src/components/groups/StayInfoPickerSheet.tsx`

A `Modal` (presentation style `pageSheet`) for selecting and entering a new extra field.

**Props:**
```typescript
interface Props {
  visible: boolean;
  initialField?: StayInfoField;   // pre-filled when editing an existing field; skips Screen 1
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
- Parking / Host Contact: label input (pre-filled, editable) + value input
- Custom: label input (blank) + value input
- `Save` → calls `onSave` with a `StayInfoField`:
  - New field: generate ID as `` `sif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` ``
  - Editing existing field: **must** use `initialField.id` unchanged
  - `wifi` fields: set `masked: true` on the returned field
  - `door_code` fields: set `masked: true` on the returned field
  - All other types: `masked` is `undefined` (falsy, renders plaintext)

**Note:** The field type cannot be changed in Screen 2. To change type, the user must close, delete the field from the card, and add a new one.

---

## Flows

### Adding stay info for the first time
1. User sees dashed "Add accommodation" row → taps
2. Card expands in edit mode
3. User fills name (required), optionally address + dates
4. Taps `+ Add info` → `StayInfoPickerSheet` opens (type picker screen)
5. Picks a type → field editor screen
6. Saves field → sheet closes, field appears in edit mode card
7. User taps `Save` on card (enabled once name is non-empty) → `updateStayInfo` called → card collapses to filled state

### Viewing credentials
1. User taps compact row → card expands in view mode
2. Masked fields show `••••••` with 👁 icon
3. User taps 👁 → value reveals (local state only, resets on next collapse + expand)
4. User taps elsewhere → card collapses

### Editing an existing field
1. Expand → tap `Edit` → edit mode
2. Tap pencil next to a field → `StayInfoPickerSheet` opens pre-filled (Screen 1 skipped)
3. Edit value → save → field updates in local edit state
4. Tap `Save` on card → persisted via `updateStayInfo`

### Removing a field
1. Expand → tap `Edit` → edit mode
2. Tap trash icon next to a field → field removed from local edit state immediately
3. Tap `Save` → persisted (or `Cancel` to undo removal)

---

## TripTab Changes

In `src/components/groups/TripTab.tsx`:
- Import and mount `<StayInfoCard groupId={groupId} stayInfo={trip.stayInfo} />` inside the `trip !== undefined` branch, between the destination/date header block and the itinerary list
- `StayInfoCard` must **not** be mounted before the early-return empty state, as `trip` is `undefined` in that branch

---

## Mock Data

Add `stayInfo` to the `trip` object inside the `group-2` entry in `MOCK_GROUPS` (`src/mocks/groups.ts`):

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
- Masked reveal: local `useState<Set<string>>` tracking which field IDs are currently revealed; cleared when card collapses
- Edit mode inputs: same `TextInput` style as `ItineraryItemModal` and `ArrivalDepartureWizard`
- Haptics: `selectionAsync` on expand/collapse, `impactAsync(Light)` on Save

---

## Out of Scope

- Check-in/check-out time pickers (date string only for now)
- Photo attachments (e.g. photo of door keypad)
- Per-field permission levels (all members see all fields)
- Backend persistence (mock-only, consistent with rest of app)
- Changing field type during edit (must delete and re-add)
