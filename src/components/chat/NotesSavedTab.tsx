import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import * as Haptics from 'expo-haptics';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { CreateNoteModal } from './CreateNoteModal';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useUserStore } from '../../stores/useUserStore';
import type { Note, Message } from '../../types';

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

      {/* Jump to message */}
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

// ─── Note card (reused from NotesTab) ───────

function NoteCard({ note, onPress }: { note: Note; onPress: () => void }) {
  return (
    <Card className="mb-3" onPress={onPress}>
      <View className="flex-row items-center mb-2">
        <View
          className="w-3 h-3 rounded-full mr-2"
          style={{ backgroundColor: note.color }}
        />
        <Text className="text-text-primary font-semibold flex-1">
          {note.title}
        </Text>
        {note.isPrivate && (
          <Text className="text-text-tertiary text-xs">Private</Text>
        )}
      </View>
      <Text className="text-text-secondary text-sm" numberOfLines={3}>
        {note.content}
      </Text>
    </Card>
  );
}

// ─── Main component ─────────────────────────

interface NotesSavedTabProps {
  conversationId: string;
}

export function NotesSavedTab({ conversationId }: NotesSavedTabProps) {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<Segment>('saved');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const conversation = useMessagesStore(
    useShallow((s) => s.getConversationById(conversationId))
  );
  const allMessages = useMessagesStore(
    useShallow((s) => s.getMessagesByConversationId(conversationId))
  );

  const notes = conversation?.metadata?.notes ?? [];
  const starredMessageIds = conversation?.metadata?.starredMessages ?? [];

  // Resolve starred messages from the message list
  const starredMessages = useMemo(() => {
    if (starredMessageIds.length === 0) return [];
    const idSet = new Set(starredMessageIds);
    return allMessages.filter((m) => idSet.has(m.id));
  }, [allMessages, starredMessageIds]);

  const handleFABPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsModalVisible(true);
  };

  const hasNoContent = starredMessages.length === 0 && notes.length === 0;

  if (hasNoContent) {
    return (
      <View className="flex-1 bg-background-primary">
        <SegmentControl
          active={activeSegment}
          onChange={setActiveSegment}
          savedCount={0}
          notesCount={0}
        />
        <EmptyState
          icon={activeSegment === 'saved' ? 'star-outline' : 'document-text-outline'}
          title={activeSegment === 'saved' ? 'No saved messages' : 'No notes yet'}
          description={
            activeSegment === 'saved'
              ? 'Star messages to save them here for quick access'
              : 'Create shared or private notes in this conversation'
          }
        />
        {activeSegment === 'notes' && <FAB onPress={handleFABPress} />}
        <CreateNoteModal
          visible={isModalVisible}
          conversationId={conversationId}
          onClose={() => setIsModalVisible(false)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-primary">
      <SegmentControl
        active={activeSegment}
        onChange={setActiveSegment}
        savedCount={starredMessages.length}
        notesCount={notes.length}
      />

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
                  // In a full app, would switch to Chat tab and scroll to message
                }}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        notes.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No notes yet"
            description="Create shared or private notes in this conversation"
          />
        ) : (
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
            renderItem={({ item }: { item: Note }) => (
              <NoteCard
                note={item}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/(tabs)/messages/note-detail',
                    params: { data: JSON.stringify(item) },
                  });
                }}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {/* FAB for notes section only */}
      {activeSegment === 'notes' && <FAB onPress={handleFABPress} />}

      <CreateNoteModal
        visible={isModalVisible}
        conversationId={conversationId}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
}

function FAB({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
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
  );
}
