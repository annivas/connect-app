# Connect Product Strategy & Implementation Plan

## Vision

**Connect is not just a messenger — it's a Relationship Operating System.**

Every conversation is a living workspace where relationships, plans, and shared life stay organized. While WhatsApp delivers messages, iMessage locks you into Apple, and Telegram chases power users with bots — Connect solves the real problem: **life coordination happens in chat, but outcomes (decisions, IOUs, action items, shared discoveries) get lost in the scroll.**

Connect remembers what matters, tracks what's owed, and helps you stay close to the people you care about.

---

## 6 Strategic Areas

### Area 1: Home Dashboard Redesign — "Your Day" Command Center
Transform the basic Home tab into an intelligent daily hub.

**New Components:**
- `src/components/home/TodayAgenda.tsx` — Timeline of today's events + due reminders
- `src/components/home/RelationshipPulse.tsx` — Cards for contacts you haven't talked to recently
- `src/components/home/PendingActions.tsx` — Unsettled expenses, unvoted polls, pending RSVPs
- `src/components/home/ActivityFeed.tsx` — Recent activity across all conversations
- `src/components/home/QuickComposeFAB.tsx` — Floating action button with compose options

**Modified Files:**
- `app/(tabs)/home/index.tsx` — Full redesign with new sections
- `src/stores/useHomeStore.ts` — Add computed getters for aggregated data
- `src/types/index.ts` — Add `ActivityFeedItem` type

### Area 2: Contact Insights Screen
Deep-dive into your relationship with any contact.

**New Components:**
- `src/components/chat/ContactInsightsSheet.tsx` — Full insights view
- `src/components/chat/InteractionChart.tsx` — Messages-per-month bar chart (last 6 months)
- `src/components/chat/SharedMemories.tsx` — Key photos/places/songs grid

**New Screen:**
- `app/(tabs)/messages/contact-insights.tsx` — Accessible from conversation info

**New Types:**
- `ContactInsights` interface with stats, interaction history, shared memories

**Modified Files:**
- `src/stores/useMessagesStore.ts` — Add `getContactInsights(userId)` getter
- `app/(tabs)/messages/info.tsx` — Add "View Insights" button

### Area 3: Smart Action Detection
Detect actionable content in messages and surface contextual suggestions.

**New Files:**
- `src/utils/actionDetector.ts` — Regex-based detection for dates, amounts, URLs, reminder phrases
- `src/components/chat/ActionSuggestionChip.tsx` — Suggestion chip below detected messages

**New Types:**
- `DetectedAction` type with variants: `reminder`, `event`, `expense`, `link_save`

**Modified Files:**
- `src/components/chat/MessageBubble.tsx` — Render ActionSuggestionChips for detected actions
- `src/components/chat/ChatTab.tsx` — Handle chip tap → open appropriate creation modal

### Area 4: Household Group Type
New group type for people sharing a living space.

**New Components:**
- `src/components/groups/ChoreRotation.tsx` — Chore list with assignee rotation
- `src/components/groups/ShoppingList.tsx` — Shared checklist
- `src/components/groups/BillTracker.tsx` — Recurring bills with due dates
- `src/components/groups/HouseholdTab.tsx` — Tab containing all household features

**New Types:**
- `Chore`, `ShoppingItem`, `RecurringBill`, `HouseholdData` interfaces

**New Mock Data:**
- `src/mocks/household.ts` — Sample household group with chores, shopping list, bills

**Modified Files:**
- `src/types/index.ts` — Add `'household'` to `GroupType` union + new interfaces
- `src/mocks/groups.ts` — Add a household group
- `app/(tabs)/groups/[id].tsx` — Add Household tab for household-type groups
- `src/stores/useGroupsStore.ts` — Add household CRUD operations

### Area 5: Rich Presence & Status System
Replace basic online/offline with expressive, contextual status.

**New Types:**
- `UserStatus` interface: `{ emoji: string; text: string; expiresAt?: Date; focusMode?: FocusMode }`
- `FocusMode` interface: `{ enabled: boolean; autoReply?: string }`

**New Components:**
- `src/components/ui/StatusPicker.tsx` — Emoji + text + duration picker
- `src/components/ui/RichStatusBadge.tsx` — Compact status display

**Modified Files:**
- `src/types/index.ts` — Extend `User` interface with `richStatus` field
- `src/mocks/users.ts` — Add rich status data to mock users
- `src/components/ui/Avatar.tsx` — Show emoji status indicator
- `src/components/chat/ConversationListItem.tsx` — Display rich status text
- `app/(tabs)/settings/profile.tsx` — Add status picker section

### Area 6: Cross-Conversation Organization
Connect content across conversations through universal save and smart collections.

**New Components:**
- `src/components/chat/SaveToCollectionSheet.tsx` — Bottom sheet for saving to collections
- `src/components/home/SmartCollectionCard.tsx` — Auto-generated collection card
- `src/components/home/UnifiedSearchScreen.tsx` — Search with type filter chips

**New Screen:**
- `app/(tabs)/home/search.tsx` — Unified search across messages, notes, reminders, expenses, shared items

**New Types:**
- `SmartCollection` type with auto-generation rules
- `SearchFilter` type for unified search

**Modified Files:**
- `src/stores/useHomeStore.ts` — Add smart collection generation, unified search
- `src/components/chat/MessageContextMenu.tsx` — Add "Save to Collection" action
- `app/(tabs)/home/index.tsx` — Add smart collections section

---

## Implementation Order

1. **Types & Mock Data** — Add all new types and mock data first (foundation)
2. **Home Dashboard** — Highest visibility, immediately demonstrates the product vision
3. **Smart Action Detection** — Lightweight utility + chip component, high perceived intelligence
4. **Rich Presence** — Extends existing User model, visible across all screens
5. **Contact Insights** — New screen leveraging existing data
6. **Household Groups** — New group type with dedicated features
7. **Cross-Conversation Organization** — Ties everything together

---

## Files Summary

### New Files (19)
```
src/types/index.ts                              (extend)
src/utils/actionDetector.ts                      (new)
src/components/home/TodayAgenda.tsx              (new)
src/components/home/RelationshipPulse.tsx        (new)
src/components/home/PendingActions.tsx           (new)
src/components/home/ActivityFeed.tsx             (new)
src/components/home/QuickComposeFAB.tsx          (new)
src/components/home/SmartCollectionCard.tsx      (new)
src/components/chat/ContactInsightsSheet.tsx     (new)
src/components/chat/InteractionChart.tsx         (new)
src/components/chat/SharedMemories.tsx           (new)
src/components/chat/ActionSuggestionChip.tsx     (new)
src/components/chat/SaveToCollectionSheet.tsx    (new)
src/components/groups/ChoreRotation.tsx          (new)
src/components/groups/ShoppingList.tsx           (new)
src/components/groups/BillTracker.tsx            (new)
src/components/groups/HouseholdTab.tsx           (new)
src/components/ui/StatusPicker.tsx               (new)
src/components/ui/RichStatusBadge.tsx            (new)
src/mocks/household.ts                          (new)
app/(tabs)/messages/contact-insights.tsx         (new)
app/(tabs)/home/search.tsx                       (new)
```

### Modified Files (14)
```
src/types/index.ts
src/stores/useHomeStore.ts
src/stores/useMessagesStore.ts
src/stores/useGroupsStore.ts
src/mocks/users.ts
src/mocks/groups.ts
app/(tabs)/home/index.tsx
app/(tabs)/groups/[id].tsx
app/(tabs)/messages/info.tsx
app/(tabs)/settings/profile.tsx
src/components/ui/Avatar.tsx
src/components/chat/ConversationListItem.tsx
src/components/chat/MessageBubble.tsx
src/components/chat/MessageContextMenu.tsx
```
