import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { useSettingsStore } from '../../../src/stores/useSettingsStore';

function ThemeOption({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      className={`flex-1 items-center py-5 rounded-2xl mx-1.5 ${
        active ? 'bg-accent-primary/20 border border-accent-primary' : 'bg-surface'
      }`}
    >
      <Ionicons
        name={icon}
        size={28}
        color={active ? '#6366F1' : '#A0A0AB'}
      />
      <Text
        className={`text-sm font-semibold mt-2 ${
          active ? 'text-accent-primary' : 'text-text-secondary'
        }`}
      >
        {label}
      </Text>
      {active && (
        <View className="absolute top-2 right-2">
          <Ionicons name="checkmark-circle" size={18} color="#6366F1" />
        </View>
      )}
    </Pressable>
  );
}

function AccentColor({
  color,
  active,
  onPress,
}: {
  color: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${
        active ? 'border-2 border-white' : ''
      }`}
      style={{ backgroundColor: color }}
    >
      {active && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
    </Pressable>
  );
}

const ACCENT_COLORS = [
  '#6366F1', // Indigo (current)
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
];

export default function AppearanceScreen() {
  const router = useRouter();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const accent = useSettingsStore((s) => s.accentColor);
  const setAccent = useSettingsStore((s) => s.setAccentColor);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">
          Appearance
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme */}
        <Text className="text-text-tertiary text-xs font-semibold px-4 pt-6 pb-3 uppercase tracking-wider">
          Theme
        </Text>
        <View className="flex-row px-4 mb-2">
          <ThemeOption
            icon="moon"
            label="Dark"
            active={theme === 'dark'}
            onPress={() => setTheme('dark')}
          />
          <ThemeOption
            icon="sunny"
            label="Light"
            active={theme === 'light'}
            onPress={() => setTheme('light')}
          />
          <ThemeOption
            icon="phone-portrait-outline"
            label="System"
            active={theme === 'system'}
            onPress={() => setTheme('system')}
          />
        </View>
        {theme !== 'dark' && (
          <View className="mx-4 mt-2 bg-surface rounded-xl p-3">
            <Text className="text-text-tertiary text-xs text-center">
              Only dark mode is available in this preview
            </Text>
          </View>
        )}

        {/* Accent color */}
        <Text className="text-text-tertiary text-xs font-semibold px-4 pt-6 pb-3 uppercase tracking-wider">
          Accent Color
        </Text>
        <View className="flex-row px-4 mb-6">
          {ACCENT_COLORS.map((c) => (
            <AccentColor
              key={c}
              color={c}
              active={accent === c}
              onPress={() => setAccent(c)}
            />
          ))}
        </View>

        {/* Preview */}
        <Text className="text-text-tertiary text-xs font-semibold px-4 pb-3 uppercase tracking-wider">
          Preview
        </Text>
        <View className="mx-4 bg-surface rounded-2xl p-4">
          <View className="flex-row items-center mb-3">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: `${accent}30` }}
            >
              <Ionicons name="color-palette" size={20} color={accent} />
            </View>
            <View className="ml-3">
              <Text className="text-text-primary font-semibold">
                Accent Preview
              </Text>
              <Text className="text-text-tertiary text-xs">
                This is how your theme looks
              </Text>
            </View>
          </View>
          <View
            className="rounded-xl py-3 items-center"
            style={{ backgroundColor: accent }}
          >
            <Text className="text-white font-semibold">
              Primary Button
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
