import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { useToastStore } from '../../../src/stores/useToastStore';

function StorageRow({
  label,
  size,
  icon,
  color,
}: {
  label: string;
  size: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View className="flex-row items-center py-3 px-4">
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: `${color}20` }}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text className="text-text-primary text-[15px] flex-1">{label}</Text>
      <Text className="text-text-tertiary text-sm">{size}</Text>
    </View>
  );
}

export default function StorageScreen() {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simulate cache clearing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsClearing(false);
    useToastStore.getState().show({
      message: 'Cache cleared successfully',
      type: 'success',
    });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">
          Storage & Data
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Storage breakdown */}
        <Text className="text-text-tertiary text-xs font-semibold px-4 pt-6 pb-3 uppercase tracking-wider">
          Storage Usage
        </Text>
        <View className="bg-surface mx-4 rounded-2xl overflow-hidden">
          <StorageRow icon="images" label="Photos & Videos" size="24.3 MB" color="#5B8EC9" />
          <View className="h-px bg-border-subtle mx-4" />
          <StorageRow icon="document" label="Documents" size="8.1 MB" color="#D4764E" />
          <View className="h-px bg-border-subtle mx-4" />
          <StorageRow icon="musical-notes" label="Audio Messages" size="3.5 MB" color="#2D9F6F" />
          <View className="h-px bg-border-subtle mx-4" />
          <StorageRow icon="cube" label="Cache" size="12.7 MB" color="#D4964E" />
        </View>

        <View className="flex-row items-center justify-between px-4 mt-3">
          <Text className="text-text-tertiary text-xs">Total: 48.6 MB</Text>
        </View>

        {/* Actions */}
        <Text className="text-text-tertiary text-xs font-semibold px-4 pt-6 pb-3 uppercase tracking-wider">
          Actions
        </Text>
        <View className="mx-4">
          <Pressable
            onPress={handleClearCache}
            disabled={isClearing}
            className="bg-surface rounded-2xl py-4 items-center active:bg-surface-hover"
          >
            <Text className={`font-semibold text-[15px] ${isClearing ? 'text-text-tertiary' : 'text-accent-primary'}`}>
              {isClearing ? 'Clearing...' : 'Clear Cache'}
            </Text>
          </Pressable>
        </View>

        <Text className="text-text-tertiary text-xs px-4 mt-3">
          Clearing cache removes temporary files and may free up storage. Your messages and media will not be deleted.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
