import React from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from '../../../src/components/ui/IconButton';
import { useSettingsStore } from '../../../src/stores/useSettingsStore';

function PrivacyToggle({
  icon,
  title,
  description,
  value,
  onToggle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center py-3.5 px-4">
      <View className="w-9 h-9 bg-surface-elevated rounded-full items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color="#7A6355" />
      </View>
      <View className="flex-1 mr-3">
        <Text className="text-text-primary text-[15px]">{title}</Text>
        <Text className="text-text-tertiary text-xs mt-0.5">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E8D5C4', true: '#D4764E' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();
  const privacy = useSettingsStore((s) => s.privacy);
  const updatePrivacy = useSettingsStore((s) => s.updatePrivacy);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">
          Privacy
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-text-tertiary text-xs font-semibold px-4 pt-6 pb-3 uppercase tracking-wider">
          Visibility
        </Text>
        <View className="bg-surface mx-4 rounded-2xl overflow-hidden">
          <PrivacyToggle
            icon="ellipse"
            title="Show Online Status"
            description="Let others see when you're active"
            value={privacy.showOnlineStatus}
            onToggle={(v) => updatePrivacy('showOnlineStatus', v)}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <PrivacyToggle
            icon="checkmark-done"
            title="Read Receipts"
            description="Show when you've read messages"
            value={privacy.readReceipts}
            onToggle={(v) => updatePrivacy('readReceipts', v)}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <PrivacyToggle
            icon="ellipsis-horizontal"
            title="Typing Indicators"
            description="Show when you're typing a message"
            value={privacy.typingIndicators}
            onToggle={(v) => updatePrivacy('typingIndicators', v)}
          />
        </View>

        <Text className="text-text-tertiary text-xs px-4 mt-3">
          These settings apply to all conversations. Disabling read receipts means you also won't see others' read receipts.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
