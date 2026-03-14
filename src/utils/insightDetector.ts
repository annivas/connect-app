import type { Message } from '../types';

// ─── Types ──────────────────────────────────────

export type InsightType = 'unanswered_question' | 'pending_decision' | 'follow_up';

export interface ConversationInsight {
  id: string;
  type: InsightType;
  messageId: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
}

// ─── Constants ──────────────────────────────────

const SCAN_WINDOW = 20;
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours
const MAX_INSIGHTS = 6;
const LOOKAHEAD = 3; // how many subsequent messages to check for a "response"

// ─── Patterns ───────────────────────────────────

const DECISION_PATTERNS = [
  /\blet'?s\s+go\s+with\b/i,
  /\bshould\s+we\b/i,
  /\bhow\s+about\b/i,
  /\bwhat\s+if\s+we\b/i,
  /\bwe\s+could\b/i,
  /\boption\s+\w+\s+or\b/i,
  /\bwhich\s+one\b/i,
  /\bwhat\s+do\s+you\s+think\b/i,
];

const CONFIRMATION_PATTERNS = [
  /\bagreed\b/i,
  /\bsounds\s+good\b/i,
  /\blet'?s\s+do\b/i,
  /\bconfirmed\b/i,
  /\bperfect\b/i,
  /\bdeal\b/i,
  /\byes\b/i,
  /\byep\b/i,
  /\byeah\b/i,
  /\bsure\b/i,
];

const FOLLOW_UP_PATTERNS = [
  /\bi'?ll\b/i,
  /\bi\s+will\b/i,
  /\blet\s+me\b/i,
  /\bwill\s+do\b/i,
  /\bi\s+need\s+to\b/i,
  /\bgonna\b/i,
  /\bgotta\b/i,
];

// ─── Detector ───────────────────────────────────

export function detectInsights(
  messages: Message[],
  currentUserId: string,
  getUserName: (id: string) => string,
  dismissedIds: Set<string>,
): ConversationInsight[] {
  const now = Date.now();
  const recent = messages.slice(-SCAN_WINDOW);
  const insights: ConversationInsight[] = [];

  for (let i = 0; i < recent.length; i++) {
    if (insights.length >= MAX_INSIGHTS) break;

    const msg = recent[i];
    if (msg.type !== 'text' || !msg.content) continue;
    if (now - new Date(msg.timestamp).getTime() > MAX_AGE_MS) continue;

    const insightId = `insight-${msg.id}`;
    if (dismissedIds.has(insightId)) continue;

    const trimmed = msg.content.trim();
    const truncated = trimmed.length > 80 ? trimmed.slice(0, 80) + '...' : trimmed;

    // Check subsequent messages for response detection
    const subsequentMessages = recent.slice(i + 1, i + 1 + LOOKAHEAD);

    // 1. Unanswered questions — questions from others that I haven't responded to
    if (
      trimmed.endsWith('?') &&
      msg.senderId !== currentUserId &&
      !subsequentMessages.some((m) => m.senderId === currentUserId)
    ) {
      insights.push({
        id: insightId,
        type: 'unanswered_question',
        messageId: msg.id,
        content: truncated,
        senderId: msg.senderId,
        senderName: getUserName(msg.senderId),
        timestamp: new Date(msg.timestamp),
      });
      continue;
    }

    // 2. Pending decisions — proposals without confirmation
    const isDecision = DECISION_PATTERNS.some((p) => p.test(msg.content));
    if (isDecision) {
      const hasConfirmation = recent
        .slice(i + 1)
        .some((m) => CONFIRMATION_PATTERNS.some((p) => p.test(m.content)));

      if (!hasConfirmation) {
        insights.push({
          id: insightId,
          type: 'pending_decision',
          messageId: msg.id,
          content: truncated,
          senderId: msg.senderId,
          senderName: getUserName(msg.senderId),
          timestamp: new Date(msg.timestamp),
        });
        continue;
      }
    }

    // 3. Follow-up needed — commitments from the current user
    if (
      msg.senderId === currentUserId &&
      FOLLOW_UP_PATTERNS.some((p) => p.test(msg.content))
    ) {
      insights.push({
        id: insightId,
        type: 'follow_up',
        messageId: msg.id,
        content: truncated,
        senderId: msg.senderId,
        senderName: getUserName(msg.senderId),
        timestamp: new Date(msg.timestamp),
      });
    }
  }

  // Newest first
  return insights.reverse();
}

// ─── Helpers ────────────────────────────────────

export function getInsightIcon(type: InsightType): string {
  switch (type) {
    case 'unanswered_question': return 'help-circle-outline';
    case 'pending_decision': return 'git-branch-outline';
    case 'follow_up': return 'arrow-redo-outline';
  }
}

export function getInsightColor(type: InsightType): string {
  switch (type) {
    case 'unanswered_question': return '#5B8EC9';
    case 'pending_decision': return '#D4964E';
    case 'follow_up': return '#C2956B';
  }
}

export function getInsightLabel(type: InsightType): string {
  switch (type) {
    case 'unanswered_question': return 'Unanswered question';
    case 'pending_decision': return 'Pending decision';
    case 'follow_up': return 'Follow-up needed';
  }
}
