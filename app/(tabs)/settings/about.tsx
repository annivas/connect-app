import React from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from '../../../src/components/ui/IconButton';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">
          About Connect
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Version */}
        <View className="items-center pt-12 pb-8">
          <View className="w-20 h-20 rounded-3xl bg-accent-primary/20 items-center justify-center mb-4">
            <Ionicons name="chatbubbles" size={40} color="#6366F1" />
          </View>
          <Text className="text-text-primary text-2xl font-bold">
            Connect
          </Text>
          <Text className="text-text-secondary text-sm mt-1">
            Version 1.0.0 (Build 1)
          </Text>
          <Text className="text-text-tertiary text-xs mt-1">
            Conversational Operating System
          </Text>
        </View>

        {/* Description */}
        <View className="mx-4 bg-surface rounded-2xl p-5 mb-4">
          <Text className="text-text-secondary text-sm leading-6">
            Connect reimagines messaging as a workspace. Every conversation
            becomes a living, organized space where your shared links, places,
            songs, notes, and expenses are automatically structured and
            accessible.
          </Text>
        </View>

        {/* Links */}
        <View className="bg-surface mx-4 rounded-2xl overflow-hidden mb-4">
          <Pressable
            onPress={() => Linking.openURL('https://example.com/terms')}
            className="flex-row items-center py-3.5 px-4 active:bg-surface-hover"
          >
            <Ionicons name="document-text-outline" size={18} color="#A0A0AB" />
            <Text className="text-text-primary text-[15px] ml-3 flex-1">
              Terms of Service
            </Text>
            <Ionicons name="open-outline" size={16} color="#6B6B76" />
          </Pressable>
          <View className="h-px bg-border-subtle mx-4" />
          <Pressable
            onPress={() => Linking.openURL('https://example.com/privacy')}
            className="flex-row items-center py-3.5 px-4 active:bg-surface-hover"
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#A0A0AB" />
            <Text className="text-text-primary text-[15px] ml-3 flex-1">
              Privacy Policy
            </Text>
            <Ionicons name="open-outline" size={16} color="#6B6B76" />
          </Pressable>
          <View className="h-px bg-border-subtle mx-4" />
          <Pressable
            onPress={() => Linking.openURL('https://example.com/licenses')}
            className="flex-row items-center py-3.5 px-4 active:bg-surface-hover"
          >
            <Ionicons name="code-slash-outline" size={18} color="#A0A0AB" />
            <Text className="text-text-primary text-[15px] ml-3 flex-1">
              Open Source Licenses
            </Text>
            <Ionicons name="open-outline" size={16} color="#6B6B76" />
          </Pressable>
        </View>

        {/* Credits */}
        <View className="items-center mt-6">
          <Text className="text-text-tertiary text-xs">
            Made with ❤️ using React Native & Expo
          </Text>
          <Text className="text-text-tertiary text-xs mt-1">
            © 2026 Connect. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
