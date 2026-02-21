import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '../../../src/components/ui/SearchBar';
import { IconButton } from '../../../src/components/ui/IconButton';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { GroupCard } from '../../../src/components/groups/GroupCard';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';

export default function GroupsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const groups = useGroupsStore((s) => s.groups);

  const filtered = useMemo(() => {
    let list = [...groups];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }

    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.lastActivity.getTime() - a.lastActivity.getTime();
    });
  }, [groups, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <View className="px-4 pt-2 pb-3">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-text-primary text-3xl font-bold">Groups</Text>
          <IconButton
            icon="add-circle"
            onPress={() => Alert.alert('Coming Soon', 'Create group is coming in a future update!')}
            size={28}
            color="#6366F1"
          />
        </View>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search groups..."
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupCard group={item} />}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 100, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No groups"
            description={searchQuery ? 'No matches for your search' : 'Create or join a group to get started'}
          />
        }
      />
    </SafeAreaView>
  );
}
