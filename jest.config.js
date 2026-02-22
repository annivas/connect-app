module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./src/test/setup.ts'],
  modulePathIgnorePatterns: ['<rootDir>/.worktrees/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@mocks/(.*)$': '<rootDir>/src/mocks/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-pager-view|react-native-tab-view|@react-native-async-storage/async-storage|zustand)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/mocks/**',
    '!src/test/**',
  ],
};
