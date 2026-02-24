import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Connect',
  slug: 'connect',
  owner: 'annivas',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'connect',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FFF8F0',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.connect.app',
    infoPlist: {
      NSContactsUsageDescription:
        'Allow Connect to access your contacts to share them in chats.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFF8F0',
    },
    package: 'com.connect.app',
    edgeToEdgeEnabled: true,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  updates: {
    url: 'https://u.expo.dev/c77c992d-bdb2-410c-8091-07d0b9e5c7cb',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  plugins: [
    'expo-router',
    [
      'expo-contacts',
      {
        contactsPermission:
          'Allow Connect to access your contacts to share them in chats.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    sentryDsn: process.env.SENTRY_DSN ?? '',
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID ?? '',
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
    useMocks: process.env.USE_MOCKS !== 'false',
    eas: {
      projectId: 'c77c992d-bdb2-410c-8091-07d0b9e5c7cb',
    },
  },
});
