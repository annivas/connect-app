import { DetectedAction, DetectedActionType } from '../types';

// Patterns for detecting actionable content in messages
const DATE_PATTERNS = [
  /\b(tomorrow|tonight|this weekend|next week|next month)\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/,
  /\b(\d{1,2}\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*)\b/i,
  /\b(at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
];

const MONEY_PATTERNS = [
  /\$\s?(\d+(?:\.\d{2})?)/,
  /(\d+(?:\.\d{2})?)\s*(?:dollars|bucks)/i,
  /(?:owe|paid|cost|split|venmo|pay)\s.*?\$?\s?(\d+(?:\.\d{2})?)/i,
];

const REMINDER_PATTERNS = [
  /\b(remind me|don't forget|remember to|make sure to|need to)\b/i,
  /\b(deadline|due by|due date|by end of)\b/i,
];

const URL_PATTERN = /https?:\/\/[^\s<>]+/i;

function extractDateContext(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function extractMoneyAmount(text: string): string | null {
  for (const pattern of MONEY_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1] || match[0];
  }
  return null;
}

function extractReminderPhrase(text: string): string | null {
  for (const pattern of REMINDER_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function extractUrl(text: string): string | null {
  const match = text.match(URL_PATTERN);
  return match ? match[0] : null;
}

export function detectActions(messageId: string, text: string): DetectedAction[] {
  const actions: DetectedAction[] = [];

  // Check for reminder-like phrases first (higher priority)
  const reminderPhrase = extractReminderPhrase(text);
  if (reminderPhrase) {
    actions.push({
      type: 'reminder',
      label: 'Create reminder',
      extractedValue: text.substring(0, 80),
      messageId,
    });
  }

  // Check for dates → suggest event
  const dateContext = extractDateContext(text);
  if (dateContext && !reminderPhrase) {
    actions.push({
      type: 'event',
      label: `Create event · ${dateContext}`,
      extractedValue: dateContext,
      messageId,
    });
  }

  // Check for money amounts → suggest expense
  const amount = extractMoneyAmount(text);
  if (amount) {
    actions.push({
      type: 'expense',
      label: `Log expense · $${amount}`,
      extractedValue: amount,
      messageId,
    });
  }

  // Check for URLs → suggest saving
  const url = extractUrl(text);
  if (url) {
    actions.push({
      type: 'link_save',
      label: 'Save link',
      extractedValue: url,
      messageId,
    });
  }

  return actions;
}

export function getActionIcon(type: DetectedActionType): string {
  switch (type) {
    case 'reminder': return 'alarm-outline';
    case 'event': return 'calendar-outline';
    case 'expense': return 'wallet-outline';
    case 'link_save': return 'bookmark-outline';
  }
}

export function getActionColor(type: DetectedActionType): string {
  switch (type) {
    case 'reminder': return '#D4964E';
    case 'event': return '#5B8EC9';
    case 'expense': return '#2D9F6F';
    case 'link_save': return '#D4764E';
  }
}
