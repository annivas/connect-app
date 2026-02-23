# Connect

A social messaging app built with Expo (SDK 54) + React Native 0.81.5 + TypeScript.

## Commands

```bash
npx expo start           # Start dev server (press i/a for iOS/Android)
npx expo start --ios     # Start on iOS simulator
npx expo start --android # Start on Android emulator
npx expo start --web     # Start in browser
npx tsc --noEmit         # Type-check without emitting
```

## Architecture

```
app/                          # Expo Router v6 (file-based routing)
  _layout.tsx                 # Root layout (GestureHandlerRootView + StatusBar)
  index.tsx                   # Entry redirect
  (tabs)/
    _layout.tsx               # Tab navigator (Messages, Groups, Home, Settings)
    messages/
      index.tsx               # Conversation list
      [id].tsx                # Chat detail (tabbed: Chat, Shared, Notes, Reminders, Ledger)
    groups/
      index.tsx               # Group list
      [id].tsx                # Group detail
    home/
      index.tsx               # Collections dashboard
    settings/
      index.tsx               # Settings menu
      profile.tsx             # Profile editor
      appearance.tsx          # Theme settings
      notifications.tsx       # Notification prefs
      about.tsx               # App info
src/
  components/
    ui/                       # Reusable primitives (Card, Avatar, Badge, IconButton, SearchBar, EmptyState, SectionHeader)
    chat/                     # Chat-specific (MessageBubble, MessageInput, ConversationListItem, ChatTab, SharedTab, NotesTab, RemindersTab, LedgerTab)
    groups/                   # Group-specific (GroupCard, GroupChatTab)
    home/                     # Home-specific (CollectionCard)
  stores/                     # Zustand v5 stores
    useMessagesStore.ts       # Conversations + messages
    useGroupsStore.ts         # Groups + group messages
    useUserStore.ts           # Current user + user lookup
    useHomeStore.ts           # Collections
  types/index.ts              # All TypeScript interfaces (User, Message, Conversation, Group, Collection, etc.)
  theme/index.ts              # Color tokens, spacing, borderRadius constants
  mocks/                      # Mock data (conversations, messages, groups, users, collections)
```

## Path Aliases

Configured in `tsconfig.json`:

| Alias | Path |
|-------|------|
| `@/*` | `./src/*` |
| `@components/*` | `./src/components/*` |
| `@stores/*` | `./src/stores/*` |
| `@mocks/*` | `./src/mocks/*` |
| `@theme/*` | `./src/theme/*` |
| `@hooks/*` | `./src/hooks/*` |
| `@utils/*` | `./src/utils/*` |

**Note:** Existing code uses relative imports — either convention is acceptable.

## Styling: NativeWind v4

Warm light theme. Three-file setup:

1. `babel.config.js` — `nativewind/babel` preset + `jsxImportSource: 'nativewind'`
2. `metro.config.js` — `withNativeWind(config, { input: './global.css' })`
3. `tailwind.config.js` — NativeWind preset, custom color tokens

Use `className` on RN components. Custom colors mirror `src/theme/index.ts`:

```
bg:     background-primary (#FFF8F0) | background-secondary (#FFF1E6) | background-tertiary (#FFE8D6)
surface: bg-surface (#FFE8D6) | bg-surface-elevated (#FFFFFF) | bg-surface-hover (#FFD6BA)
accent:  bg-accent-primary (#D4764E) | bg-accent-secondary (#C2956B) | bg-accent-tertiary (#8B6F5A)
text:    text-text-primary (#2D1F14) | text-text-secondary (#7A6355) | text-text-tertiary (#A8937F)
border:  border-border (#E8D5C4) | border-border-subtle (#F0E2D4)
status:  text-status-success (#2D9F6F) | text-status-error (#C94F4F) | text-status-warning (#D4964E) | text-status-info (#5B8EC9)
```

When using hardcoded hex values in `color=` or `style=` props, always use the above tokens. Never use old dark-theme colors.

## Zustand v5 Patterns

Stores use `create<State>((set, get) => ({...}))` — no middleware.

**Critical:** Zustand v5 removed the two-argument `useStore(selector, equalityFn)` pattern.

```ts
// WRONG - causes TS2554
useStore((s) => s.field, shallow);

// CORRECT - use useShallow wrapper
import { useShallow } from 'zustand/react/shallow';
useStore(useShallow((s) => ({ a: s.a, b: s.b })));
```

For event handlers, prefer `useStore.getState()` at call-time over render-time selectors.

Getter methods (e.g. `getConversationById`) live inside the store, called via `get()`.

## Haptic Feedback

```ts
import * as Haptics from 'expo-haptics';

Haptics.selectionAsync();                              // Light selections (toggles, picks)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Navigation taps
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Significant actions (long-press, swipe)
```

## Animation Patterns

Interactive cards use Reanimated `withSpring` scale animations:

```ts
const scale = useSharedValue(1);
// onPressIn:  scale.value = withSpring(0.98, { damping: 15, stiffness: 300 })
// onPressOut: scale.value = withSpring(1, { damping: 15, stiffness: 300 })
```

Use `Animated.createAnimatedComponent(Pressable)` for pressable animations.

## Component Conventions

- Named exports, not default exports (e.g. `export function Card`)
- Props defined as `interface Props` or inline
- Platform-specific logic via `Platform.OS === 'ios'` checks (e.g. ActionSheet vs Alert, BlurView tab bar)
- Tab bar uses `expo-blur` BlurView on iOS, opaque background on Android

## Data Layer

Currently **mock-only** — all data comes from `src/mocks/`. No backend, no API calls, no persistence (no AsyncStorage usage yet despite the dependency being installed). The `CURRENT_USER_ID` constant from `src/mocks/users.ts` identifies the logged-in user.

## Key Config

- **New Architecture** enabled (`newArchEnabled: true` in `app.json`)
- **Typed Routes** enabled (`experiments.typedRoutes: true`)
- **Orientation** locked to portrait
- **UI Style** warm light theme (NativeWind custom tokens in `tailwind.config.js`)
- `react-native-reanimated/plugin` must be **last** in babel plugins array

## Gotchas

- The `reanimated` babel plugin must remain the **last** entry in `babel.config.js` plugins
- NativeWind's `className` prop requires the babel preset — without it, styles silently fail
- Tab bar height differs per platform: 88pt (iOS) vs 70dp (Android)
- `expo-image` is installed but Expo's `<Image>` from `expo-image` should be preferred over RN's `<Image>`
