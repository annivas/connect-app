import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SearchBar } from '../../../src/components/ui/SearchBar';
import { IconButton } from '../../../src/components/ui/IconButton';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { GroupCard } from '../../../src/components/groups/GroupCard';
import { CreateGroupModal } from '../../../src/components/groups/CreateGroupModal';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';

type GroupFilter = 'all' | 'unread' | 'archived';

export default function GroupsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [filter, setFilter] = useState<GroupFilter>('all');
  const groups = useGroupsStore((s) => s.groups);

  // Compute badge counts for filters
  const unreadCount = useMemo(() => groups.filter((g) => !g.isArchived && (g.unreadCount > 0 || g.isMarkedUnread)).length, [groups]);
  const archivedCount = useMemo(() => groups.filter((g) => g.isArchived).length, [groups]);

  const filtered = useMemo(() => {
    let list = [...groups];

    // Apply filter
    switch (filter) {
      case 'all':
        list = list.filter((g) => !g.isArchived);
        break;
      case 'unread':
        list = list.filter((g) => !g.isArchived && (g.unreadCount > 0 || g.isMarkedUnread));
        break;
      case 'archived':
        list = list.filter((g) => g.isArchived);
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) => g.name.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q),
      );
    }

    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.lastActivity.getTime() - a.lastActivity.getTime();
    });
  }, [groups, searchQuery, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await useGroupsStore.getState().init();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <View className="px-4 pt-2 pb-3">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-text-primary text-3xl font-bold">Groups</Text>
          <IconButton
            icon="add-circle"
            onPress={() => setIsModalVisible(true)}
            size={28}
            color="#D4764E"
          />
        </View>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search groups..."
        />

        {/* Filter bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          {([
            { key: 'all' as GroupFilter, label: 'All' },
            { key: 'unread' as GroupFilter, label: 'Unread', count: unreadCount },
            { key: 'archived' as GroupFilter, label: 'Archived', count: archivedCount },
          ]).map((f) => {
            const isActive = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => { Haptics.selectionAsync(); setFilter(f.key); }}
                className={`flex-row items-center px-3.5 py-2 rounded-full mr-2 ${
                  isActive ? 'bg-accent-primary' : 'bg-surface'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {f.label}
                </Text>
                {f.count !== undefined && f.count > 0 && (
                  <View className={`ml-1.5 px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/30' : 'bg-accent-primary/20'
                  }`}>
                    <Text className={`text-[10px] font-bold ${
                      isActive ? 'text-white' : 'text-accent-primary'
                    }`}>
                      {f.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupCard group={item} />}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 100, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4764E" />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No groups"
            description={searchQuery ? 'No matches for your search' : 'Create or join a group to get started'}
          />
        }
      />

      <CreateGroupModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreated={(group) => {
          setIsModalVisible(false);
          router.push(`/(tabs)/groups/${group.id}` as any);
        }}
      />
    </SafeAreaView>
  );
}
