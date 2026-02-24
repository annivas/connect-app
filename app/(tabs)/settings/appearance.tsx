import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { useSettingsStore } from '../../../src/stores/useSettingsStore';

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
        active ? 'border-2 border-text-primary' : ''
      }`}
      style={{ backgroundColor: color }}
    >
      {active && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
    </Pressable>
  );
}

const ACCENT_COLORS = [
  '#D4764E', // Terracotta (default)
  '#C2956B', // Gold-Brown
  '#5B8EC9', // Muted Blue
  '#2D9F6F', // Warm Emerald
  '#D4964E', // Warm Amber
  '#C94F4F', // Warm Red
];

const THEME_OPTIONS: {
  key: 'light' | 'dark' | 'system';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}[] = [
  { key: 'light', label: 'Light', icon: 'sunny', description: 'Warm cream theme' },
  { key: 'dark', label: 'Dark', icon: 'moon', description: 'Warm dark theme' },
  { key: 'system', label: 'System', icon: 'phone-portrait-outline', description: 'Match device setting' },
];

export default function AppearanceScreen() {
  const router = useRouter();
  const accent = useSettingsStore((s) => s.accentColor);
  const setAccent = useSettingsStore((s) => s.setAccentColor);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

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
        <View className="mx-4 flex-row gap-2">
          {THEME_OPTIONS.map((option) => {
            const isSelected = theme === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTheme(option.key);
                }}
                className={`flex-1 items-center py-4 rounded-2xl border ${
                  isSelected
                    ? 'bg-accent-primary/20 border-accent-primary'
                    : 'bg-surface border-border'
                }`}
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={isSelected ? '#D4764E' : '#7A6355'}
                />
                <Text
                  className={`text-sm mt-1.5 font-semibold ${
                    isSelected ? 'text-accent-primary' : 'text-text-primary'
                  }`}
                >
                  {option.label}
                </Text>
                <Text
                  className={`text-[10px] mt-0.5 ${
                    isSelected ? 'text-accent-primary/70' : 'text-text-tertiary'
                  }`}
                >
                  {option.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
