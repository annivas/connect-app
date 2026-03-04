import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SearchBar } from '../../../src/components/ui/SearchBar';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AIAgentListItem } from '../../../src/components/ai/AIAgentListItem';
import { AIAgentAvatar } from '../../../src/components/ai/AIAgentAvatar';
import { useAIStore } from '../../../src/stores/useAIStore';

export default function AIScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const agents = useAIStore((s) => s.agents);
  const subchats = useAIStore((s) => s.subchats);

  useEffect(() => {
    useAIStore.getState().init();
  }, []);

  const connectedAgents = useMemo(
    () => agents.filter((a) => a.isConnected),
    [agents],
  );

  const disconnectedAgents = useMemo(
    () => agents.filter((a) => !a.isConnected),
    [agents],
  );

  const filteredConnected = useMemo(() => {
    if (!searchQuery.trim()) return connectedAgents;
    const q = searchQuery.toLowerCase();
    return connectedAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.provider.toLowerCase().includes(q),
    );
  }, [connectedAgents, searchQuery]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <View className="px-4 pt-2 pb-1">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-text-primary text-3xl font-bold">
            AI Agents
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Future: open add agent modal
            }}
            className="w-10 h-10 bg-accent-primary rounded-full items-center justify-center"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search AI agents..."
        />
      </View>

      {/* Connected agents */}
      <FlatList
        data={filteredConnected}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const agentSubchats = subchats.filter(
            (s) => s.agentId === item.id,
          );
          const unread = useAIStore.getState().getAgentUnreadCount(item.id);
          return (
            <AIAgentListItem
              agent={item}
              subchats={agentSubchats}
              unreadCount={unread}
            />
          );
        }}
        contentContainerStyle={
          filteredConnected.length === 0 ? { flex: 1 } : { paddingBottom: 100 }
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          filteredConnected.length > 0 ? (
            <View className="px-4 pt-3 pb-1">
              <Text className="text-text-secondary text-[13px] font-semibold uppercase tracking-wide">
                Connected
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          disconnectedAgents.length > 0 ? (
            <View>
              <View className="px-4 pt-4 pb-2">
                <Text className="text-text-secondary text-[13px] font-semibold uppercase tracking-wide">
                  Available
                </Text>
              </View>
              {disconnectedAgents.map((agent) => (
                <Pressable
                  key={agent.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    useAIStore.getState().toggleAgentConnection(agent.id);
                  }}
                  className="flex-row items-center px-4 py-3 bg-background-primary active:bg-surface-hover"
                >
                  <AIAgentAvatar
                    uri={agent.avatar}
                    size="md"
                    provider={agent.provider}
                    color={agent.color}
                    isConnected={false}
                  />
                  <View className="flex-1 ml-3">
                    <Text className="text-text-primary text-[15px] font-medium">
                      {agent.name}
                    </Text>
                    <Text className="text-text-tertiary text-[12px]" numberOfLines={1}>
                      {agent.description}
                    </Text>
                  </View>
                  <View className="bg-accent-primary rounded-lg px-3 py-1.5">
                    <Text className="text-white text-[12px] font-semibold">
                      Connect
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="sparkles-outline"
            title="No AI agents"
            description={
              searchQuery
                ? 'No matches for your search'
                : 'Connect an AI agent to get started'
            }
          />
        }
      />
    </SafeAreaView>
  );
}
