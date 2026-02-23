import type { Message } from '../types';

/**
 * Patterns that suggest someone is proposing a group activity.
 * Each pattern is case-insensitive and tested against message content.
 */
const ACTIVITY_PATTERNS = [
  /\blet'?s\s+(play|go|grab|get|meet|hang|do|try|watch|check out)\b/i,
  /\bwanna\s+(play|go|grab|get|meet|hang|do|try|watch|check out)\b/i,
  /\bshould\s+we\s+(play|go|grab|get|meet|hang|do|try|watch|check out)\b/i,
  /\bwho'?s?\s+(down|in)\s+(for|to)\b/i,
  /\banyone\s+(down|interested|wanna|want to)\b/i,
  /\b(this|next)\s+(saturday|sunday|weekend|friday|monday|tuesday|wednesday|thursday)\b/i,
  /\b(tomorrow|tonight)\s+(we|let's|wanna)\b/i,
  /\b(game\s+night|movie\s+night|dinner|brunch|lunch|drinks|beers|bbq|hike|gym|run)\b/i,
  /\b(pickup|pick-?up)\s+(game|basketball|soccer|football|volleyball)\b/i,
  /\bwho\s+wants\s+to\b/i,
  /\bare\s+you\s+(guys\s+)?(free|available|down)\b/i,
];

/** How many of the most recent messages to scan */
const SCAN_WINDOW = 15;

/** Don't suggest events for messages older than 24 hours */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface EventHint {
  messageId: string;
  content: string;
  senderId: string;
  timestamp: Date;
  /** The matched keyword/phrase for context */
  matchedText: string;
}

/**
 * Scans recent group messages for activity proposals.
 * Returns the most recent match, or null if none found.
 */
export function detectEventHint(
  messages: Message[],
  currentUserId: string,
  dismissedIds: Set<string>,
): EventHint | null {
  const now = Date.now();
  // Messages should be chronological (oldest first); take the last N
  const recent = messages.slice(-SCAN_WINDOW);

  // Scan from newest to oldest, return first match
  for (let i = recent.length - 1; i >= 0; i--) {
    const msg = recent[i];

    // Skip: already dismissed, too old, not text
    if (dismissedIds.has(msg.id)) continue;
    if (now - msg.timestamp.getTime() > MAX_AGE_MS) continue;
    if (msg.type !== 'text') continue;

    for (const pattern of ACTIVITY_PATTERNS) {
      const match = msg.content.match(pattern);
      if (match) {
        return {
          messageId: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          timestamp: msg.timestamp,
          matchedText: match[0],
        };
      }
    }
  }

  return null;
}
