import React, { useLayoutEffect, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';
import { IconButton } from '../../../src/components/ui/IconButton';
import { AIAgentAvatar } from '../../../src/components/ai/AIAgentAvatar';
import { AISubchatListItem } from '../../../src/components/ai/AISubchatListItem';
import { CreateSubchatModal } from '../../../src/components/ai/CreateSubchatModal';
import { useAIStore } from '../../../src/stores/useAIStore';

export default function AIAgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [showCreateSubchat, setShowCreateSubchat] = useState(false);

  // Hide bottom tab bar
  const parentNavigation = navigation.getParent();
  useLayoutEffect(() => {
    parentNavigation?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      parentNavigation?.setOptions({
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#FFF1E6',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 8,
        },
      });
    };
  }, [parentNavigation]);

  const agent = useAIStore(useShallow((s) => s.getAgentById(id!)));
  const subchats = useAIStore(useShallow((s) => s.getSubchatsByAgentId(id!)));

  if (!agent) {
    return (
      <SafeAreaView className="flex-1 bg-background-primary items-center justify-center">
        <Text className="text-text-secondary">Agent not found</Text>
      </SafeAreaView>
    );
  }

  const handleOpenSubchat = (subchatId: string) => {
    useAIStore.getState().markSubchatAsRead(subchatId);
    router.push({
      pathname: '/(tabs)/ai/subchat',
      params: { subchatId, agentId: agent.id },
    } as never);
  };

  const handleCreateSubchat = (title: string) => {
    const subchatId = useAIStore.getState().createSubchat(agent.id, title);
    handleOpenSubchat(subchatId);
  };

  // Split into General and Subchats
  const generalSubchat = subchats.find((s) => s.title === 'General');
  const otherSubchats = subchats.filter((s) => s.title !== 'General');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />

        <View className="flex-1 flex-row items-center ml-1">
          <AIAgentAvatar
            uri={agent.avatar}
            size="md"
            provider={agent.provider}
            color={agent.color}
            isConnected={agent.isConnected}
          />
          <View className="ml-3 flex-1">
            <Text className="text-text-primary text-[17px] font-semibold">
              {agent.name}
            </Text>
            <Text className="text-text-tertiary text-xs" numberOfLines={1}>
              {agent.model} · {agent.isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        <IconButton
          icon="ellipsis-horizontal"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
      </View>

      {/* Agent info card */}
      <View className="mx-4 mt-3 mb-2 p-3 bg-surface-elevated rounded-2xl border border-border-subtle">
        <Text className="text-text-secondary text-[13px] leading-[18px]">
          {agent.description}
        </Text>
      </View>

      {/* General subchat */}
      {generalSubchat && (
        <View>
          <View className="px-4 pt-3 pb-1">
            <Text className="text-text-secondary text-[13px] font-semibold uppercase tracking-wide">
              General
            </Text>
          </View>
          <AISubchatListItem
            subchat={generalSubchat}
            agentColor={agent.color}
            onPress={handleOpenSubchat}
            isUnread={
              !!(generalSubchat.lastMessage?.isFromAI && !generalSubchat.lastMessage?.isRead)
            }
          />
        </View>
      )}

      {/* Subchats section */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-1">
        <Text className="text-text-secondary text-[13px] font-semibold uppercase tracking-wide">
          Subchats
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCreateSubchat(true);
          }}
          className="flex-row items-center"
        >
          <Ionicons name="add-circle-outline" size={18} color="#D4764E" />
          <Text className="text-accent-primary text-[13px] font-medium ml-1">
            New
          </Text>
        </Pressable>
      </View>

      {otherSubchats.length > 0 ? (
        <View>
          {otherSubchats.map((subchat) => (
            <AISubchatListItem
              key={subchat.id}
              subchat={subchat}
              agentColor={agent.color}
              onPress={handleOpenSubchat}
              isUnread={
                !!(subchat.lastMessage?.isFromAI && !subchat.lastMessage?.isRead)
              }
            />
          ))}
        </View>
      ) : (
        <View className="items-center py-8 px-4">
          <Ionicons name="chatbubbles-outline" size={40} color="#A8937F" />
          <Text className="text-text-tertiary text-sm mt-2 text-center">
            Create focused workspaces for different topics
          </Text>
        </View>
      )}

      <CreateSubchatModal
        visible={showCreateSubchat}
        agentName={agent.name}
        agentColor={agent.color}
        onClose={() => setShowCreateSubchat(false)}
        onCreate={handleCreateSubchat}
      />
    </SafeAreaView>
  );
}
