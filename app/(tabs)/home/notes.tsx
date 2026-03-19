import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, Alert, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../../../src/components/ui/IconButton';
import { Card } from '../../../src/components/ui/Card';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SearchBar } from '../../../src/components/ui/SearchBar';
import { Avatar } from '../../../src/components/ui/Avatar';
import { useMessagesStore } from '../../../src/stores/useMessagesStore';
import { useGroupsStore } from '../../../src/stores/useGroupsStore';
import { useUserStore } from '../../../src/stores/useUserStore';
import type { Note } from '../../../src/types';

interface NoteWithSource extends Note {
  sourceId: string;
  sourceName: string;
  sourceType: 'conversation' | 'group';
}

type Filter = 'all' | 'active' | 'archived';

export default function AllNotesScreen() {
  const router = useRouter();
  const conversations = useMessagesStore((s) => s.conversations);
  const groups = useGroupsStore((s) => s.groups);
  const getUserById = useUserStore((s) => s.getUserById);
  const currentUserId = useUserStore((s) => s.currentUser?.id);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showArchivedSection, setShowArchivedSection] = useState(true);

  // Aggregate notes from all conversations and groups
  const allNotes = useMemo(() => {
    const convNotes: NoteWithSource[] = conversations.flatMap((c) => {
      const otherUserId = c.participants.find((p) => p !== currentUserId);
      const otherUser = otherUserId ? getUserById(otherUserId) : null;
      const name = otherUser?.name ?? 'Unknown';
      return (c.metadata?.notes ?? []).map((note) => ({
        ...note,
        sourceId: c.id,
        sourceName: name,
        sourceType: 'conversation' as const,
      }));
    });

    const groupNotes: NoteWithSource[] = groups.flatMap((g) =>
      (g.metadata?.notes ?? []).map((note) => ({
        ...note,
        sourceId: g.id,
        sourceName: g.name,
        sourceType: 'group' as const,
      })),
    );

    return [...convNotes, ...groupNotes];
  }, [conversations, groups, getUserById, currentUserId]);

  // Filter and search
  const filtered = useMemo(() => {
    let notes = allNotes;
    if (search.trim()) {
      const q = search.toLowerCase();
      notes = notes.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
      );
    }
    if (filter === 'active') notes = notes.filter((n) => !n.isArchived);
    if (filter === 'archived') notes = notes.filter((n) => n.isArchived);
    return notes;
  }, [allNotes, search, filter]);

  const activeNotes = filtered.filter((n) => !n.isArchived);
  const archivedNotes = filtered.filter((n) => n.isArchived);

  const handlePress = (item: NoteWithSource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.sourceType === 'conversation') {
      router.push({
        pathname: '/(tabs)/messages/note-detail',
        params: { noteId: item.id, conversationId: item.sourceId },
      });
    } else {
      router.push({
        pathname: '/(tabs)/messages/note-detail',
        params: { noteId: item.id, groupId: item.sourceId },
      } as any);
    }
  };

  const handleLongPress = (item: NoteWithSource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isArchived = !!item.isArchived;
    Alert.alert('Note Options', item.title, [
      {
        text: 'Edit',
        onPress: () => handlePress(item),
      },
      {
        text: isArchived ? 'Unarchive' : 'Archive',
        onPress: () => {
          Haptics.selectionAsync();
          if (item.sourceType === 'conversation') {
            useMessagesStore.getState().toggleNoteArchive(item.sourceId, item.id);
          } else {
            useGroupsStore.getState().toggleGroupNoteArchive(item.sourceId, item.id);
          }
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Note', `Delete "${item.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (item.sourceType === 'conversation') {
                  useMessagesStore.getState().deleteNote(item.sourceId, item.id);
                } else {
                  useGroupsStore.getState().deleteGroupNote(item.sourceId, item.id);
                }
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleCreateNote = (targetType: 'conversation' | 'group', targetId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTargetPicker(false);
    if (targetType === 'conversation') {
      router.push({
        pathname: '/(tabs)/messages/note-detail',
        params: { conversationId: targetId },
      });
    } else {
      router.push({
        pathname: '/(tabs)/messages/note-detail',
        params: { groupId: targetId },
      } as any);
    }
  };

  const renderNote = (item: NoteWithSource) => (
    <Pressable
      onPress={() => handlePress(item)}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
      key={`${item.sourceType}-${item.id}`}
    >
      <Card className="mb-3">
        <View className="flex-row items-center mb-1">
          <View
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: item.color }}
          />
          <Text
            className={`font-semibold text-sm flex-1 ${
              item.isArchived ? 'text-text-tertiary' : 'text-text-primary'
            }`}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.isPinned && (
            <Ionicons name="pin" size={12} color="#D4764E" style={{ marginRight: 4 }} />
          )}
          {item.isPrivate && (
            <Ionicons name="lock-closed" size={11} color="#A8937F" />
          )}
        </View>
        <Text className="text-text-secondary text-xs mb-1.5" numberOfLines={2}>
          {item.content}
        </Text>
        <View className="flex-row items-center">
          <Ionicons
            name={item.sourceType === 'group' ? 'people-outline' : 'person-outline'}
            size={10}
            color="#A8937F"
          />
          <Text className="text-text-tertiary text-[10px] ml-1">
            {item.sourceName}
          </Text>
          {item.isArchived && (
            <View className="ml-2 px-1.5 py-0.5 bg-surface rounded">
              <Text className="text-text-tertiary text-[9px] font-medium">Archived</Text>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1 flex-1">All Notes</Text>
        <Text className="text-text-tertiary text-xs mr-2">{allNotes.length} total</Text>
      </View>

      {/* Search + Filter */}
      <View className="px-4 pt-3 pb-1">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search notes..." />
        <View className="flex-row gap-2 mt-2">
          {FILTERS.map((f) => (
            <Pressable
              key={f.value}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(f.value);
              }}
              className={`px-3 py-1.5 rounded-full ${
                filter === f.value ? 'bg-accent-primary' : 'bg-surface'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  filter === f.value ? 'text-white' : 'text-text-secondary'
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No notes"
          description={search ? 'No notes match your search' : 'Notes from your conversations and groups will appear here'}
        />
      ) : (
        <FlatList
          data={filter === 'all' ? activeNotes : filtered}
          keyExtractor={(item) => `${item.sourceType}-${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListHeaderComponent={
            filter === 'all' && activeNotes.length > 0 ? (
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                Active ({activeNotes.length})
              </Text>
            ) : null
          }
          renderItem={({ item }) => renderNote(item)}
          ListFooterComponent={
            filter === 'all' && archivedNotes.length > 0 ? (
              <View>
                <Pressable
                  onPress={() => setShowArchivedSection(!showArchivedSection)}
                  className="flex-row items-center justify-between mt-4 mb-3"
                >
                  <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                    Archived ({archivedNotes.length})
                  </Text>
                  <Ionicons
                    name={showArchivedSection ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#A8937F"
                  />
                </Pressable>
                {showArchivedSection && archivedNotes.map(renderNote)}
              </View>
            ) : null
          }
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowTargetPicker(true);
        }}
        className="absolute bottom-36 right-8 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
        style={{
          shadowColor: '#D4764E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Target Picker Modal */}
      <Modal
        visible={showTargetPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTargetPicker(false)}
      >
        <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
            <Pressable onPress={() => setShowTargetPicker(false)} hitSlop={8}>
              <Text className="text-accent-primary text-[16px]">Cancel</Text>
            </Pressable>
            <Text className="text-text-primary text-[17px] font-semibold">Add Note To</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">Conversations</Text>
            {conversations.map((c) => {
              const otherUserId = c.participants.find((p) => p !== currentUserId);
              const otherUser = otherUserId ? getUserById(otherUserId) : null;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => handleCreateNote('conversation', c.id)}
                  className="flex-row items-center py-3 border-b border-border-subtle active:opacity-70"
                >
                  {otherUser?.avatar ? (
                    <Avatar uri={otherUser.avatar} size="sm" />
                  ) : (
                    <View className="w-8 h-8 rounded-full bg-surface items-center justify-center">
                      <Ionicons name="person" size={16} color="#A8937F" />
                    </View>
                  )}
                  <Text className="text-text-primary text-[15px] font-medium ml-3 flex-1">{otherUser?.name ?? 'Unknown'}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#A8937F" />
                </Pressable>
              );
            })}

            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3 mt-5">Groups</Text>
            {groups.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => handleCreateNote('group', g.id)}
                className="flex-row items-center py-3 border-b border-border-subtle active:opacity-70"
              >
                <View className="w-8 h-8 rounded-full bg-accent-tertiary/20 items-center justify-center">
                  <Ionicons name="people" size={16} color="#5B8EC9" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-text-primary text-[15px] font-medium">{g.name}</Text>
                  <Text className="text-text-tertiary text-xs">{g.members.length} members</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#A8937F" />
              </Pressable>
            ))}
            <View className="h-8" />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
