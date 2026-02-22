import React, { useRef, useEffect } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { isSameDay } from 'date-fns';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useUserStore } from '../../stores/useUserStore';

interface Props {
  conversationId: string;
}

export function ChatTab({ conversationId }: Props) {
  const listRef = useRef<FlatList>(null);
  const messages = useMessagesStore(
    useShallow((s) => s.getMessagesByConversationId(conversationId))
  );
  const sendMessage = useMessagesStore((s) => s.sendMessage);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = (content: string) => {
    const userId = useUserStore.getState().currentUser?.id;
    if (!userId) return;
    sendMessage(conversationId, content, userId);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background-primary"
      keyboardVerticalOffset={140}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const showDateDivider = !prev || !isSameDay(prev.timestamp, item.timestamp);
          return <MessageBubble message={item} showDateDivider={showDateDivider} />;
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
      />
      <MessageInput onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}
