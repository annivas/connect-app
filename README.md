# Connect

A social messaging app built with Expo, React Native, and TypeScript.

## Tech Stack

- **Framework:** Expo SDK 54, React Native 0.81.5, React 19
- **Routing:** Expo Router v6 (file-based)
- **Styling:** NativeWind v4 (Tailwind CSS for React Native)
- **State:** Zustand v5
- **Backend:** Supabase (Postgres, Auth, Realtime, Storage)
- **Language:** TypeScript (strict mode)

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (macOS) or Android Emulator

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your Supabase credentials in .env

# Start the dev server
npm start
```

Press `i` for iOS simulator or `a` for Android emulator.

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Start on iOS simulator |
| `npm run android` | Start on Android emulator |
| `npm run web` | Start in browser |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Project Structure

```
app/                        # Expo Router screens
  (auth)/                   # Auth flow (sign-in, sign-up)
  (tabs)/                   # Main tab navigator
    messages/               # Conversations & chat
    groups/                 # Group conversations
    home/                   # Dashboard & collections
    settings/               # App settings
src/
  components/               # React components
    ui/                     # Reusable primitives
    chat/                   # Chat-specific components
    groups/                 # Group-specific components
    home/                   # Home-specific components
  stores/                   # Zustand state stores
  services/                 # Data access layer (repository pattern)
  types/                    # TypeScript type definitions
  theme/                    # Color tokens & design constants
  config/                   # Environment & app configuration
  hooks/                    # Custom React hooks
  lib/                      # Third-party integrations
  utils/                    # Utility functions
  mocks/                    # Mock data (development)
```

## Architecture

The app uses a **repository pattern** to abstract data access. Stores consume repository interfaces, with implementations swappable between mock data and Supabase via the `USE_MOCKS` environment variable.

```
UI (Screens/Components)
    ↓
Zustand Stores
    ↓
Repository Interfaces
    ↓
Mock Implementation  |  Supabase Implementation
```
