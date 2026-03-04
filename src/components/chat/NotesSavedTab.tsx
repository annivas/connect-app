import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { NoteListItem } from '../notes/NoteListItem';
import { NoteSearchHeader } from '../notes/NoteSearchHeader';
import { NoteTemplateSheet } from '../notes/NoteTemplateSheet';
import { useUserStore } from '../../stores/useUserStore';
import { useToastStore } from '../../stores/useToastStore';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useGroupsStore } from '../../stores/useGroupsStore';
import type { Note, NoteBlock, NoteTemplate, Message } from '../../types';

// ─── Segment control ────────────────────────

type Segment = 'saved' | 'notes';

function SegmentControl({
  active,
  onChange,
  savedCount,
  notesCount,
}: {
  active: Segment;
  onChange: (segment: Segment) => void;
  savedCount: number;
  notesCount: number;
}) {
  return (
    <View className="flex-row bg-surface rounded-xl mx-4 mt-4 mb-3 p-1">
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onChange('saved'); }}
        className={`flex-1 py-2.5 rounded-lg items-center ${
          active === 'saved' ? 'bg-accent-primary' : ''
        }`}
      >
        <Text
          className={`text-[13px] font-semibold ${
            active === 'saved' ? 'text-white' : 'text-text-secondary'
          }`}
        >
          Saved Messages{savedCount > 0 ? ` (${savedCount})` : ''}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onChange('notes'); }}
        className={`flex-1 py-2.5 rounded-lg items-center ${
          active === 'notes' ? 'bg-accent-primary' : ''
        }`}
      >
        <Text
          className={`text-[13px] font-semibold ${
            active === 'notes' ? 'text-white' : 'text-text-secondary'
          }`}
        >
          Notes{notesCount > 0 ? ` (${notesCount})` : ''}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Saved message card ─────────────────────

function SavedMessageCard({
  message,
  onJump,
}: {
  message: Message;
  onJump: () => void;
}) {
  const getUserById = useUserStore((s) => s.getUserById);
  const sender = getUserById(message.senderId);

  return (
    <Card className="mb-3">
      <View className="flex-row items-center mb-2">
        <Ionicons name="star" size={14} color="#F59E0B" />
        <Text className="text-[13px] font-semibold text-text-primary ml-2 flex-1" numberOfLines={1}>
          {sender?.name ?? 'Unknown'}
        </Text>
        <Text className="text-text-tertiary text-[11px]">
          {format(message.timestamp, 'MMM d, yyyy')}
        </Text>
      </View>

      <Text className="text-text-secondary text-[14px]" numberOfLines={4}>
        {message.content}
      </Text>

      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onJump(); }}
        className="flex-row items-center mt-2.5 pt-2 border-t border-border-subtle"
      >
        <Ionicons name="return-down-forward-outline" size={14} color="#D4764E" />
        <Text className="text-accent-primary text-[12px] font-medium ml-1.5">
          Jump to message
        </Text>
      </Pressable>
    </Card>
  );
}

// ─── Main component ─────────────────────────

interface NotesSavedTabProps {
  notes: Note[];
  starredMessageIds: string[];
  allMessages: Message[];
  onCreateNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteNote?: (noteId: string) => void;
  contextId?: string;
  contextType?: 'conversation' | 'group';
}

export function NotesSavedTab({ notes, starredMessageIds, allMessages, onCreateNote, onDeleteNote, contextId, contextType }: NotesSavedTabProps) {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<Segment>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const starredMessages = useMemo(() => {
    if (starredMessageIds.length === 0) return [];
    const idSet = new Set(starredMessageIds);
    return allMessages.filter((m) => idSet.has(m.id));
  }, [allMessages, starredMessageIds]);

  // Filter notes by search
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    );
  }, [notes, searchQuery]);

  // Split into pinned/unpinned
  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.isPinned);
  const sortedNotes = [...pinnedNotes, ...unpinnedNotes];

  const handleDeleteNote = (note: Note) => {
    if (!onDeleteNote) return;
    Alert.alert(
      'Delete Note',
      `Delete "${note.title || 'Untitled'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDeleteNote(note.id);
            useToastStore.getState().show({ message: 'Note deleted', type: 'success' });
          },
        },
      ],
    );
  };

  const handleTogglePin = (note: Note) => {
    Haptics.selectionAsync();
    if (contextType === 'conversation' && contextId) {
      useMessagesStore.getState().toggleNotePin(contextId, note.id);
    } else if (contextType === 'group' && contextId) {
      useGroupsStore.getState().toggleGroupNotePin(contextId, note.id);
    }
  };

  const handleNotePress = (note: Note) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/messages/note-detail',
      params: {
        noteId: note.id,
        ...(contextType === 'conversation' ? { conversationId: contextId } : {}),
        ...(contextType === 'group' ? { groupId: contextId } : {}),
      },
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

  const handleCreateNote = (isPrivate: boolean, template?: NoteTemplate) => {
    const blocks: NoteBlock[] = template
      ? template.blocks.map((b, i) => ({ ...b, id: `block-${Date.now()}-${i}` }))
      : [{ id: `block-${Date.now()}`, type: 'paragraph' as const, content: '' }];

    const title = template?.name ?? '';
    const content = blocks.map((b) => b.content).join('\n').trim();

    const noteData = {
      title,
      content,
      blocks,
      color: '#D4764E',
      isPrivate,
      isPinned: false,
      createdBy: 'current-user',
      templateId: template?.id,
    };

    onCreateNote(noteData as Omit<Note, 'id' | 'createdAt' | 'updatedAt'>);
  };

  const handleFABPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('New Note', 'Choose an option', [
      { text: 'Blank Note (Shared)', onPress: () => handleCreateNote(false) },
      { text: 'Blank Note (Private)', onPress: () => handleCreateNote(true) },
      { text: 'From Template', onPress: () => setShowTemplates(true) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const hasNoContent = starredMessages.length === 0 && notes.length === 0;

  return (
    <View className="flex-1 bg-background-primary">
      <SegmentControl
        active={activeSegment}
        onChange={setActiveSegment}
        savedCount={starredMessages.length}
        notesCount={notes.length}
      />

      {activeSegment === 'notes' && notes.length > 0 && (
        <NoteSearchHeader query={searchQuery} onChangeQuery={setSearchQuery} />
      )}

      {activeSegment === 'saved' ? (
        starredMessages.length === 0 ? (
          <EmptyState
            icon="star-outline"
            title="No saved messages"
            description="Star messages to save them here for quick access"
          />
        ) : (
          <FlatList
            data={starredMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
            renderItem={({ item }: { item: Message }) => (
              <SavedMessageCard
                message={item}
                onJump={() => {
                  useToastStore.getState().show({ message: 'Navigating to message...', type: 'info' });
                  router.back();
                }}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        sortedNotes.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title={searchQuery ? 'No matching notes' : 'No notes yet'}
            description={searchQuery ? 'Try a different search term' : 'Create shared or private notes'}
          />
        ) : (
          <FlatList
            data={sortedNotes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
            renderItem={({ item }: { item: Note }) => (
              <NoteListItem
                note={item}
                onPress={() => handleNotePress(item)}
                onLongPress={() => handleNoteLongPress(item)}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeSegment === 'notes' && (
        <Pressable
          onPress={handleFABPress}
          className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
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
      )}

      <NoteTemplateSheet
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(template) => {
          Alert.alert('Note Visibility', 'Who can see this note?', [
            { text: 'Shared', onPress: () => handleCreateNote(false, template) },
            { text: 'Private to You', onPress: () => handleCreateNote(true, template) },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
      />
    </View>
  );
}
