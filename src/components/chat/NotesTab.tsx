import React, { useState, useMemo } from 'react';
import { View, Text, SectionList, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import * as Haptics from 'expo-haptics';
import { EmptyState } from '../ui/EmptyState';
import { NoteListItem } from '../notes/NoteListItem';
import { NoteSearchHeader } from '../notes/NoteSearchHeader';
import { NoteTemplateSheet } from '../notes/NoteTemplateSheet';
import { useMessagesStore } from '../../stores/useMessagesStore';
import type { Note, NoteBlock, NoteTemplate, NoteTemplateCategory } from '../../types';

interface Props {
  conversationId: string;
}

type NoteFilter = 'all' | 'shared' | 'private';

export function NotesTab({ conversationId }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [showTemplates, setShowTemplates] = useState(false);

  const conversation = useMessagesStore(
    useShallow((s) => s.getConversationById(conversationId))
  );
  const notes = conversation?.metadata?.notes ?? [];

  // Filter and search
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (filter === 'shared') result = result.filter((n) => !n.isPrivate);
    if (filter === 'private') result = result.filter((n) => n.isPrivate);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      );
    }
    return result;
  }, [notes, filter, searchQuery]);

  // Split into pinned and unpinned
  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const unpinnedNotes = useMemo(() => filteredNotes.filter((n) => !n.isPinned), [filteredNotes]);

  const sections = useMemo(() => {
    const s: { title: string; data: Note[] }[] = [];
    if (pinnedNotes.length > 0) s.push({ title: 'Pinned', data: pinnedNotes });
    if (unpinnedNotes.length > 0) s.push({ title: 'Notes', data: unpinnedNotes });
    return s;
  }, [pinnedNotes, unpinnedNotes]);

  const handleCreateNote = (isPrivate: boolean, template?: NoteTemplate) => {
    const blocks: NoteBlock[] = template
      ? template.blocks.map((b, i) => ({
          ...b,
          id: `block-${Date.now()}-${i}`,
        }))
      : [{ id: `block-${Date.now()}`, type: 'paragraph' as const, content: '' }];

    const title = template?.name ?? '';
    const content = blocks.map((b) => b.content).join('\n').trim();

    useMessagesStore.getState().createNote(conversationId, {
      title,
      content,
      blocks,
      color: '#D4764E',
      isPrivate,
      templateId: template?.id,
    }).then((note) => {
      router.push({
        pathname: '/(tabs)/messages/note-detail',
        params: { noteId: note.id, conversationId },
      });
    });
  };

  const handleDeleteNote = (note: Note) => {
    Alert.alert('Delete Note', `Delete "${note.title || 'Untitled'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          useMessagesStore.getState().deleteNote(conversationId, note.id);
        },
      },
    ]);
  };

  const handleTogglePin = (note: Note) => {
    Haptics.selectionAsync();
    useMessagesStore.getState().toggleNotePin(conversationId, note.id);
  };

  const handleNotePress = (note: Note) => {
    router.push({
      pathname: '/(tabs)/messages/note-detail',
      params: { noteId: note.id, conversationId },
    });
  };

  const handleNoteLongPress = (note: Note) => {
    Alert.alert(note.title || 'Untitled', undefined, [
      {
        text: note.isPinned ? 'Unpin' : 'Pin to Top',
        onPress: () => handleTogglePin(note),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeleteNote(note),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleFABPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('New Note', 'Choose an option', [
      {
        text: 'Blank Note (Shared)',
        onPress: () => handleCreateNote(false),
      },
      {
        text: 'Blank Note (Private)',
        onPress: () => handleCreateNote(true),
      },
      {
        text: 'From Template',
        onPress: () => setShowTemplates(true),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleTemplateSelect = (template: NoteTemplate) => {
    // Ask shared vs private, then create
    Alert.alert('Note Visibility', 'Who can see this note?', [
      {
        text: 'Shared',
        onPress: () => handleCreateNote(false, template),
      },
      {
        text: 'Private to You',
        onPress: () => handleCreateNote(true, template),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View className="flex-1 bg-background-primary">
      <NoteSearchHeader query={searchQuery} onChangeQuery={setSearchQuery} />

      {/* Filter pills */}
      <View className="flex-row px-4 mb-2" style={{ gap: 8 }}>
        {(['all', 'shared', 'private'] as NoteFilter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => {
              Haptics.selectionAsync();
              setFilter(f);
            }}
            className={`px-3 py-1.5 rounded-full ${
              filter === f ? 'bg-accent-primary' : 'bg-surface'
            }`}
          >
            <Text
              className={`text-[12px] font-medium capitalize ${
                filter === f ? 'text-white' : 'text-text-secondary'
              }`}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      {filteredNotes.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title={searchQuery ? 'No matching notes' : 'No notes yet'}
          description={
            searchQuery
              ? 'Try a different search term'
              : 'Create shared or private notes in this conversation'
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center mt-2 mb-1.5">
              {section.title === 'Pinned' && (
                <Ionicons name="pin" size={12} color="#D4764E" style={{ marginRight: 4 }} />
              )}
              <Text className="text-text-secondary text-[12px] font-semibold uppercase tracking-wider">
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <NoteListItem
              note={item}
              onPress={() => handleNotePress(item)}
              onLongPress={() => handleNoteLongPress(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={handleFABPress}
        className="absolute bottom-14 right-6 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
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

      <NoteTemplateSheet
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={handleTemplateSelect}
      />
    </View>
  );
}
