import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from '../../../src/components/ui/IconButton';

const FAQ_ITEMS = [
  {
    question: 'How do I create a group?',
    answer: 'Tap the + button on the Groups tab to create a new group. Add members, pick a name, and choose a type (General, Trip, Sports, or Project).',
  },
  {
    question: 'How do disappearing messages work?',
    answer: 'Open a conversation, tap the header to view info, then enable Disappearing Messages. Choose a duration — messages will automatically delete after that time.',
  },
  {
    question: 'How do I split expenses in a group?',
    answer: 'Open your group info and find the Expenses section. Tap to add a new expense, enter the amount, and select who to split it with.',
  },
  {
    question: 'Can I schedule a message?',
    answer: 'Yes! When composing a message, tap the clock icon next to the send button. Choose a date and time, and your message will be sent automatically.',
  },
  {
    question: 'How do I pin a message?',
    answer: 'Long-press on any message to open the context menu, then select Pin. Pinned messages appear in the conversation info.',
  },
  {
    question: 'How do I forward a message?',
    answer: 'Long-press on a message and select Forward. Choose one or more conversations to send it to.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Pressable onPress={() => setExpanded(!expanded)} className="py-3.5 px-4">
      <View className="flex-row items-center">
        <Text className="text-text-primary text-[15px] flex-1 mr-2">{question}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#A8937F"
        />
      </View>
      {expanded && (
        <Text className="text-text-secondary text-sm mt-2 leading-5">
          {answer}
        </Text>
      )}
    </Pressable>
  );
}

export default function HelpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text className="text-text-primary text-[17px] font-semibold ml-1">
          Help & Support
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-text-tertiary text-xs font-semibold px-4 pt-6 pb-3 uppercase tracking-wider">
          Frequently Asked Questions
        </Text>
        <View className="bg-surface mx-4 rounded-2xl overflow-hidden">
          {FAQ_ITEMS.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View className="h-px bg-border-subtle mx-4" />}
              <FAQItem question={item.question} answer={item.answer} />
            </React.Fragment>
          ))}
        </View>

        <Text className="text-text-tertiary text-xs px-4 mt-6 text-center">
          Need more help? Use Send Feedback in Settings to reach us.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
