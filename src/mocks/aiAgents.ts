import { AIAgent, AISubchat, AIMessage, AISuggestedAction } from '../types';

// ─── AI Agents ──────────────────────────────

export const MOCK_AI_AGENTS: AIAgent[] = [
  {
    id: 'agent-claude',
    name: 'Claude',
    provider: 'anthropic',
    model: 'Claude Sonnet',
    avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Anthropic_logo.svg/512px-Anthropic_logo.svg.png',
    description: 'Anthropic\'s AI assistant — thoughtful, nuanced, and great at analysis.',
    color: '#D4764E',
    isConnected: true,
  },
  {
    id: 'agent-chatgpt',
    name: 'ChatGPT',
    provider: 'openai',
    model: 'GPT-4o',
    avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png',
    description: 'OpenAI\'s versatile assistant — creative, fast, and broadly capable.',
    color: '#10A37F',
    isConnected: true,
  },
  {
    id: 'agent-gemini',
    name: 'Gemini',
    provider: 'google',
    model: 'Gemini Pro',
    avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/512px-Google_Gemini_logo.svg.png',
    description: 'Google\'s AI assistant — great at search, reasoning, and multimodal tasks.',
    color: '#4285F4',
    isConnected: false,
  },
];

// ─── Helper: relative dates ─────────────────

function hoursAgo(h: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d;
}

function minutesAgo(m: number): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() - m);
  return d;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ─── Subchats ───────────────────────────────

export const MOCK_AI_SUBCHATS: AISubchat[] = [
  // Claude subchats
  {
    id: 'subchat-claude-general',
    agentId: 'agent-claude',
    title: 'General',
    createdAt: daysAgo(14),
    updatedAt: minutesAgo(5),
    aiVisibility: 'ai-enabled',
    lastMessage: {
      id: 'ai-msg-c1-last',
      subchatId: 'subchat-claude-general',
      agentId: 'agent-claude',
      senderId: 'agent-claude',
      content: 'I\'d be happy to help you brainstorm more ideas for the pitch deck. What section would you like to focus on next?',
      timestamp: minutesAgo(5),
      isFromAI: true,
      isRead: true,
    },
  },
  {
    id: 'subchat-claude-pitch',
    agentId: 'agent-claude',
    title: 'Startup pitch',
    createdAt: daysAgo(7),
    updatedAt: hoursAgo(2),
    aiVisibility: 'ai-enabled',
    lastMessage: {
      id: 'ai-msg-c2-last',
      subchatId: 'subchat-claude-pitch',
      agentId: 'agent-claude',
      senderId: 'agent-claude',
      content: 'Here\'s the revised executive summary incorporating your feedback on the market size numbers.',
      timestamp: hoursAgo(2),
      isFromAI: true,
      isRead: true,
    },
  },
  {
    id: 'subchat-claude-research',
    agentId: 'agent-claude',
    title: 'Investor research',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
    aiVisibility: 'ai-enabled',
    lastMessage: {
      id: 'ai-msg-c3-last',
      subchatId: 'subchat-claude-research',
      agentId: 'agent-claude',
      senderId: 'current-user',
      content: 'Can you find more VCs focused on messaging/communication startups?',
      timestamp: daysAgo(1),
      isFromAI: false,
      isRead: true,
    },
  },
  {
    id: 'subchat-claude-trip',
    agentId: 'agent-claude',
    title: 'Trip planning',
    createdAt: daysAgo(3),
    updatedAt: hoursAgo(6),
    aiVisibility: 'ai-restricted',
    lastMessage: {
      id: 'ai-msg-c4-last',
      subchatId: 'subchat-claude-trip',
      agentId: 'agent-claude',
      senderId: 'agent-claude',
      content: 'I\'ve put together a 5-day Tokyo itinerary with restaurant recommendations near each stop.',
      timestamp: hoursAgo(6),
      isFromAI: true,
      isRead: false,
    },
  },

  // ChatGPT subchats
  {
    id: 'subchat-gpt-general',
    agentId: 'agent-chatgpt',
    title: 'General',
    createdAt: daysAgo(10),
    updatedAt: hoursAgo(1),
    aiVisibility: 'ai-enabled',
    lastMessage: {
      id: 'ai-msg-g1-last',
      subchatId: 'subchat-gpt-general',
      agentId: 'agent-chatgpt',
      senderId: 'agent-chatgpt',
      content: 'Sure! Here\'s a comparison table of the three approaches we discussed.',
      timestamp: hoursAgo(1),
      isFromAI: true,
      isRead: true,
    },
  },
  {
    id: 'subchat-gpt-code',
    agentId: 'agent-chatgpt',
    title: 'Code review',
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
    aiVisibility: 'ai-enabled',
    lastMessage: {
      id: 'ai-msg-g2-last',
      subchatId: 'subchat-gpt-code',
      agentId: 'agent-chatgpt',
      senderId: 'agent-chatgpt',
      content: 'The refactored version reduces the time complexity from O(n²) to O(n log n). Want me to also add unit tests?',
      timestamp: daysAgo(2),
      isFromAI: true,
      isRead: true,
    },
  },

  // Gemini subchats
  {
    id: 'subchat-gemini-general',
    agentId: 'agent-gemini',
    title: 'General',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
    aiVisibility: 'ai-enabled',
    lastMessage: {
      id: 'ai-msg-gem-last',
      subchatId: 'subchat-gemini-general',
      agentId: 'agent-gemini',
      senderId: 'current-user',
      content: 'Hey Gemini, can you help me research some topics?',
      timestamp: daysAgo(2),
      isFromAI: false,
      isRead: true,
    },
  },
];

// ─── AI Messages ────────────────────────────

export const MOCK_AI_MESSAGES: AIMessage[] = [
  // Claude General subchat
  {
    id: 'ai-msg-c1-1',
    subchatId: 'subchat-claude-general',
    agentId: 'agent-claude',
    senderId: 'current-user',
    content: 'Hey Claude, I\'m working on a startup idea — a messaging app with AI agents built in. What do you think about the market opportunity?',
    timestamp: hoursAgo(3),
    isFromAI: false,
    isRead: true,
  },
  {
    id: 'ai-msg-c1-2',
    subchatId: 'subchat-claude-general',
    agentId: 'agent-claude',
    senderId: 'agent-claude',
    content: 'That\'s an interesting concept! The messaging space is competitive but there\'s a real gap in how AI is integrated. Most current apps treat AI as a separate tool rather than a native participant.\n\nA few thoughts on market opportunity:\n\n• **Team collaboration** — Small teams already coordinate heavily through chat. Adding AI directly could eliminate tool-switching.\n• **AI fatigue** — Users are tired of managing separate AI subscriptions. An integrated approach has appeal.\n• **Privacy differentiation** — If you give users control over when AI can "see" their conversations, that\'s a strong trust signal.\n\nWhat specific use cases are you targeting first?',
    timestamp: hoursAgo(3),
    isFromAI: true,
    isRead: true,
  },
  {
    id: 'ai-msg-c1-3',
    subchatId: 'subchat-claude-general',
    agentId: 'agent-claude',
    senderId: 'current-user',
    content: 'We\'re thinking startups and small teams first, then expanding. The key insight is that decisions, tasks, and docs get lost in group chats.',
    timestamp: hoursAgo(2),
    isFromAI: false,
    isRead: true,
  },
  {
    id: 'ai-msg-c1-4',
    subchatId: 'subchat-claude-general',
    agentId: 'agent-claude',
    senderId: 'agent-claude',
    content: 'Smart wedge. Startups have the pain acutely — they\'re moving fast, using group chats for everything, and constantly losing context.\n\nHere\'s what I\'d suggest for the pitch:\n\n1. **Lead with the problem** — "Teams already run on chat, but chat wasn\'t designed for coordination"\n2. **Position AI as the solution** — Not another tool, but a teammate\n3. **Show the privacy model** — Chat tab (AI-enabled) + Private tab (human-only) builds trust\n\nWant me to help draft the pitch deck outline?',
    timestamp: hoursAgo(2),
    isFromAI: true,
    isRead: true,
  },
  {
    id: 'ai-msg-c1-5',
    subchatId: 'subchat-claude-general',
    agentId: 'agent-claude',
    senderId: 'current-user',
    content: 'Yes please! Let\'s brainstorm the pitch deck structure.',
    timestamp: minutesAgo(10),
    isFromAI: false,
    isRead: true,
  },
  {
    id: 'ai-msg-c1-6',
    subchatId: 'subchat-claude-general',
    agentId: 'agent-claude',
    senderId: 'agent-claude',
    content: 'I\'d be happy to help you brainstorm more ideas for the pitch deck. What section would you like to focus on next?',
    timestamp: minutesAgo(5),
    isFromAI: true,
    isRead: true,
  },

  // Claude Startup pitch subchat
  {
    id: 'ai-msg-c2-1',
    subchatId: 'subchat-claude-pitch',
    agentId: 'agent-claude',
    senderId: 'current-user',
    content: 'Let\'s work on the executive summary for the pitch. Our app is called Connect.',
    timestamp: daysAgo(5),
    isFromAI: false,
    isRead: true,
  },
  {
    id: 'ai-msg-c2-2',
    subchatId: 'subchat-claude-pitch',
    agentId: 'agent-claude',
    senderId: 'agent-claude',
    content: 'Here\'s a draft executive summary:\n\n**Connect** — Where humans and AI collaborate in conversation.\n\nConnect is a messaging platform that brings AI agents directly into group conversations. Instead of switching between chat apps and AI tools, teams can communicate, brainstorm, plan, and execute — all in one place.\n\n**The Problem:** Teams coordinate through messaging, but decisions, tasks, and context get buried. AI tools exist separately, creating friction.\n\n**The Solution:** AI agents (Claude, ChatGPT, Gemini) join conversations as participants, helping with analysis, document creation, scheduling, and task tracking — while users maintain full control over AI access.\n\n**Target Market:** 30M+ small teams and startups globally who rely on messaging for daily coordination.\n\nWant me to refine any section?',
    timestamp: daysAgo(5),
    isFromAI: true,
    isRead: true,
  },
  {
    id: 'ai-msg-c2-3',
    subchatId: 'subchat-claude-pitch',
    agentId: 'agent-claude',
    senderId: 'current-user',
    content: 'That\'s great! Can you update the market size? I think we should be more specific — maybe reference the business messaging market TAM.',
    timestamp: hoursAgo(3),
    isFromAI: false,
    isRead: true,
  },
  {
    id: 'ai-msg-c2-4',
    subchatId: 'subchat-claude-pitch',
    agentId: 'agent-claude',
    senderId: 'agent-claude',
    content: 'Here\'s the revised executive summary incorporating your feedback on the market size numbers.',
    timestamp: hoursAgo(2),
    isFromAI: true,
    isRead: true,
  },

  // ChatGPT General subchat
  {
    id: 'ai-msg-g1-1',
    subchatId: 'subchat-gpt-general',
    agentId: 'agent-chatgpt',
    senderId: 'current-user',
    content: 'Can you compare React Native vs Flutter vs native development for a messaging app?',
    timestamp: hoursAgo(2),
    isFromAI: false,
    isRead: true,
  },
  {
    id: 'ai-msg-g1-2',
    subchatId: 'subchat-gpt-general',
    agentId: 'agent-chatgpt',
    senderId: 'agent-chatgpt',
    content: 'Sure! Here\'s a comparison table of the three approaches we discussed.',
    timestamp: hoursAgo(1),
    isFromAI: true,
    isRead: true,
  },

  // Gemini General subchat
  {
    id: 'ai-msg-gem-1',
    subchatId: 'subchat-gemini-general',
    agentId: 'agent-gemini',
    senderId: 'current-user',
    content: 'Hey Gemini, can you help me research some topics?',
    timestamp: daysAgo(2),
    isFromAI: false,
    isRead: true,
  },
];

// ─── AI Suggested Actions ───────────────────

export const MOCK_AI_SUGGESTIONS: AISuggestedAction[] = [
  {
    id: 'suggestion-1',
    type: 'meeting',
    label: 'Create meeting',
    description: 'Schedule a meeting with Sarah tomorrow at 3pm',
    messageId: 'ai-msg-c1-4',
    isApproved: false,
    isDismissed: false,
  },
  {
    id: 'suggestion-2',
    type: 'task',
    label: 'Add task',
    description: 'Draft pitch deck outline',
    messageId: 'ai-msg-c1-4',
    isApproved: false,
    isDismissed: false,
  },
  {
    id: 'suggestion-3',
    type: 'document',
    label: 'Create document',
    description: 'Generate executive summary document',
    messageId: 'ai-msg-c2-2',
    isApproved: true,
    isDismissed: false,
  },
];
