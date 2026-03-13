import { create } from 'zustand';
import { AIAgent, AISubchat, AIMessage, AISuggestedAction, AIVisibility } from '../types';
import { MOCK_AI_AGENTS, MOCK_AI_SUBCHATS, MOCK_AI_MESSAGES, MOCK_AI_SUGGESTIONS } from '../mocks/aiAgents';
import { generateMockAIResponse } from '../utils/mockAIResponse';

interface AIState {
  agents: AIAgent[];
  subchats: AISubchat[];
  messages: AIMessage[];
  suggestions: AISuggestedAction[];
  isLoading: boolean;

  init: () => void;

  // Agent methods
  getAgentById: (id: string) => AIAgent | undefined;
  getConnectedAgents: () => AIAgent[];
  toggleAgentConnection: (agentId: string) => void;

  // Subchat methods
  getSubchatsByAgentId: (agentId: string) => AISubchat[];
  getSubchatById: (id: string) => AISubchat | undefined;
  createSubchat: (agentId: string, title: string) => string;
  updateSubchatVisibility: (subchatId: string, visibility: AIVisibility) => void;
  deleteSubchat: (subchatId: string) => void;

  // Message methods
  getMessagesBySubchatId: (subchatId: string) => AIMessage[];
  sendMessage: (subchatId: string, content: string) => void;
  markSubchatAsRead: (subchatId: string) => void;

  // Suggestion methods
  getSuggestionsByMessageId: (messageId: string) => AISuggestedAction[];
  approveSuggestion: (suggestionId: string) => void;
  dismissSuggestion: (suggestionId: string) => void;

  // Aggregates
  getUnreadCount: () => number;
  getAgentUnreadCount: (agentId: string) => number;
}

export const useAIStore = create<AIState>((set, get) => ({
  agents: [],
  subchats: [],
  messages: [],
  suggestions: [],
  isLoading: false,

  init: () => {
    set({
      agents: MOCK_AI_AGENTS,
      subchats: MOCK_AI_SUBCHATS,
      messages: MOCK_AI_MESSAGES,
      suggestions: MOCK_AI_SUGGESTIONS,
      isLoading: false,
    });
  },

  // ─── Agent Methods ────────────────────────

  getAgentById: (id) => get().agents.find((a) => a.id === id),

  getConnectedAgents: () => get().agents.filter((a) => a.isConnected),

  toggleAgentConnection: (agentId) => {
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId ? { ...a, isConnected: !a.isConnected } : a
      ),
    }));
  },

  // ─── Subchat Methods ──────────────────────

  getSubchatsByAgentId: (agentId) =>
    get()
      .subchats.filter((s) => s.agentId === agentId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),

  getSubchatById: (id) => get().subchats.find((s) => s.id === id),

  createSubchat: (agentId, title) => {
    const id = `subchat-${Date.now()}`;
    const newSubchat: AISubchat = {
      id,
      agentId,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      aiVisibility: 'ai-enabled',
    };
    set((s) => ({ subchats: [newSubchat, ...s.subchats] }));
    return id;
  },

  updateSubchatVisibility: (subchatId, visibility) => {
    set((s) => ({
      subchats: s.subchats.map((sc) =>
        sc.id === subchatId ? { ...sc, aiVisibility: visibility } : sc
      ),
    }));
  },

  deleteSubchat: (subchatId) => {
    set((s) => ({
      subchats: s.subchats.filter((sc) => sc.id !== subchatId),
      messages: s.messages.filter((m) => m.subchatId !== subchatId),
    }));
  },

  // ─── Message Methods ──────────────────────

  getMessagesBySubchatId: (subchatId) =>
    get()
      .messages.filter((m) => m.subchatId === subchatId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),

  sendMessage: (subchatId, content) => {
    const subchat = get().subchats.find((s) => s.id === subchatId);
    if (!subchat) return;

    const userMessage: AIMessage = {
      id: `ai-msg-${Date.now()}`,
      subchatId,
      agentId: subchat.agentId,
      senderId: 'current-user',
      content,
      timestamp: new Date(),
      isFromAI: false,
      isRead: true,
    };

    // Add user message and update subchat
    set((s) => ({
      messages: [...s.messages, userMessage],
      subchats: s.subchats.map((sc) =>
        sc.id === subchatId
          ? { ...sc, updatedAt: new Date(), lastMessage: userMessage }
          : sc
      ),
    }));

    // Simulate AI response after a delay
    setTimeout(() => {
      const agent = get().getAgentById(subchat.agentId);
      const aiResponse: AIMessage = {
        id: `ai-msg-${Date.now()}-ai`,
        subchatId,
        agentId: subchat.agentId,
        senderId: subchat.agentId,
        content: generateMockAIResponse(agent?.name ?? 'AI', content),
        timestamp: new Date(),
        isFromAI: true,
        isRead: true,
      };

      set((s) => ({
        messages: [...s.messages, aiResponse],
        subchats: s.subchats.map((sc) =>
          sc.id === subchatId
            ? { ...sc, updatedAt: new Date(), lastMessage: aiResponse }
            : sc
        ),
      }));
    }, 1500);
  },

  markSubchatAsRead: (subchatId) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.subchatId === subchatId ? { ...m, isRead: true } : m
      ),
      subchats: s.subchats.map((sc) =>
        sc.id === subchatId && sc.lastMessage
          ? { ...sc, lastMessage: { ...sc.lastMessage, isRead: true } }
          : sc
      ),
    }));
  },

  // ─── Suggestion Methods ───────────────────

  getSuggestionsByMessageId: (messageId) =>
    get().suggestions.filter(
      (s) => s.messageId === messageId && !s.isDismissed
    ),

  approveSuggestion: (suggestionId) => {
    set((s) => ({
      suggestions: s.suggestions.map((sug) =>
        sug.id === suggestionId ? { ...sug, isApproved: true } : sug
      ),
    }));
  },

  dismissSuggestion: (suggestionId) => {
    set((s) => ({
      suggestions: s.suggestions.map((sug) =>
        sug.id === suggestionId ? { ...sug, isDismissed: true } : sug
      ),
    }));
  },

  // ─── Aggregates ───────────────────────────

  getUnreadCount: () =>
    get().subchats.filter(
      (sc) => sc.lastMessage && !sc.lastMessage.isRead && sc.lastMessage.isFromAI
    ).length,

  getAgentUnreadCount: (agentId) =>
    get()
      .subchats.filter(
        (sc) =>
          sc.agentId === agentId &&
          sc.lastMessage &&
          !sc.lastMessage.isRead &&
          sc.lastMessage.isFromAI
      ).length,
}));

// Mock response generator extracted to src/utils/mockAIResponse.ts
