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

export default function AppearanceScreen() {
  const router = useRouter();
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
        <View className="mx-4 bg-surface rounded-2xl p-4 flex-row items-center mb-2">
          <View className="w-10 h-10 bg-accent-primary/20 rounded-full items-center justify-center mr-3">
            <Ionicons name="moon" size={22} color="#D4764E" />
          </View>
          <View>
            <Text className="text-text-primary font-semibold text-[15px]">
              Dark Mode
            </Text>
            <Text className="text-text-tertiary text-xs mt-0.5">
              Light mode coming in a future update
            </Text>
          </View>
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
