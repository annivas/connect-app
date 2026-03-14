import { Message } from '../types';

export interface SummaryActionItem {
  id: string;
  text: string;
  assignee?: string;
  assigneeId?: string;
}

export interface ConversationSummary {
  overview: string;
  keyTopics: string[];
  decisions: string[];
  actionItems: SummaryActionItem[];
  messageCount: number;
  participantCount: number;
  timeSpan: { from: Date; to: Date };
}

// ─── Topic clusters ─────────────────────────────
const TOPIC_MAP: Record<string, string[]> = {
  'Dining & Food': ['dinner', 'lunch', 'restaurant', 'food', 'eat', 'cook', 'recipe', 'pizza', 'coffee', 'brunch'],
  'Scheduling': ['meeting', 'schedule', 'calendar', 'call', 'appointment', 'tomorrow', 'next week'],
  'Travel & Outings': ['trip', 'travel', 'flight', 'hotel', 'vacation', 'road trip', 'hike', 'beach'],
  'Finances': ['money', 'paid', 'split', 'owe', 'expense', 'budget', 'cost', 'price', 'rent', 'bill'],
  'Work & Projects': ['project', 'deadline', 'task', 'work', 'client', 'presentation', 'report', 'launch'],
  'Events & Celebrations': ['party', 'birthday', 'wedding', 'concert', 'event', 'celebrate', 'anniversary'],
  'Health & Fitness': ['gym', 'workout', 'run', 'yoga', 'health', 'doctor', 'sleep'],
  'Entertainment': ['movie', 'show', 'game', 'music', 'book', 'podcast', 'series', 'netflix'],
};

// ─── Decision phrases ───────────────────────────
const DECISION_PHRASES = [
  "let's go with", "let's do", "agreed", "decided", "sounds good",
  "confirmed", "let's stick with", "we'll go", "that works",
  "perfect, so", "ok so", "alright,", "deal", "settled",
];

// ─── Action item phrases ────────────────────────
const ACTION_PHRASES = [
  "remind me", "don't forget", "need to", "i'll", "i will",
  "will do", "should", "make sure", "gotta", "have to",
  "can you", "could you", "please", "let's make sure",
];

function extractTopics(messages: Message[]): string[] {
  const allText = messages
    .filter((m) => m.type === 'text' && m.content)
    .map((m) => m.content.toLowerCase())
    .join(' ');

  const found: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_MAP)) {
    if (keywords.some((kw) => allText.includes(kw))) {
      found.push(topic);
    }
  }
  return found.length > 0 ? found.slice(0, 5) : ['General Discussion'];
}

function extractDecisions(messages: Message[], getUserName: (id: string) => string): string[] {
  const decisions: string[] = [];
  for (const msg of messages) {
    if (msg.type !== 'text' || !msg.content) continue;
    const lower = msg.content.toLowerCase();
    for (const phrase of DECISION_PHRASES) {
      if (lower.includes(phrase)) {
        const name = getUserName(msg.senderId);
        const excerpt = msg.content.length > 80
          ? msg.content.slice(0, 80) + '...'
          : msg.content;
        decisions.push(`${name}: "${excerpt}"`);
        break;
      }
    }
  }
  return decisions.slice(0, 5);
}

function extractActionItems(
  messages: Message[],
  getUserName: (id: string) => string,
): SummaryActionItem[] {
  const items: SummaryActionItem[] = [];
  for (const msg of messages) {
    if (msg.type !== 'text' || !msg.content) continue;
    const lower = msg.content.toLowerCase();
    for (const phrase of ACTION_PHRASES) {
      if (lower.includes(phrase)) {
        const text = msg.content.length > 100
          ? msg.content.slice(0, 100) + '...'
          : msg.content;
        items.push({
          id: `action-${msg.id}`,
          text,
          assignee: getUserName(msg.senderId),
          assigneeId: msg.senderId,
        });
        break;
      }
    }
  }
  return items.slice(0, 6);
}

function buildOverview(
  messages: Message[],
  participants: string[],
  getUserName: (id: string) => string,
): string {
  const names = participants.slice(0, 3).map(getUserName);
  const nameStr = names.length <= 2
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;

  const from = messages[0]?.timestamp;
  const to = messages[messages.length - 1]?.timestamp;

  let timeStr = '';
  if (from && to) {
    const diffMs = new Date(to).getTime() - new Date(from).getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) timeStr = 'in the last hour';
    else if (diffHours < 24) timeStr = `over the past ${diffHours} hours`;
    else timeStr = `over ${Math.round(diffHours / 24)} days`;
  }

  return `A conversation between ${nameStr} with ${messages.length} messages ${timeStr}. The discussion covered various topics with several key points and action items identified.`;
}

export function generateMockSummary(
  messages: Message[],
  getUserName: (id: string) => string,
): Promise<ConversationSummary> {
  return new Promise((resolve) => {
    const delay = 1500 + Math.random() * 1000;

    setTimeout(() => {
      const textMessages = messages.filter((m) => m.type === 'text' && m.content);
      const participantIds = [...new Set(messages.map((m) => m.senderId))];
      const sorted = [...textMessages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      // Edge case: too few messages
      if (sorted.length < 3) {
        resolve({
          overview: `A brief exchange with ${sorted.length} message${sorted.length === 1 ? '' : 's'}. Not enough content for a detailed summary.`,
          keyTopics: ['Brief exchange'],
          decisions: [],
          actionItems: [],
          messageCount: messages.length,
          participantCount: participantIds.length,
          timeSpan: {
            from: sorted[0]?.timestamp ?? new Date(),
            to: sorted[sorted.length - 1]?.timestamp ?? new Date(),
          },
        });
        return;
      }

      resolve({
        overview: buildOverview(sorted, participantIds, getUserName),
        keyTopics: extractTopics(sorted),
        decisions: extractDecisions(sorted, getUserName),
        actionItems: extractActionItems(sorted, getUserName),
        messageCount: messages.length,
        participantCount: participantIds.length,
        timeSpan: {
          from: sorted[0].timestamp,
          to: sorted[sorted.length - 1].timestamp,
        },
      });
    }, delay);
  });
}
