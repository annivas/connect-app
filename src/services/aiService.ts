import { config } from '../config/env';
import { supabase } from '../lib/supabase';
import { generateMockSummary, ConversationSummary } from '../utils/mockSummarizer';
import { detectInsights, ConversationInsight } from '../utils/insightDetector';
import { detectActions } from '../utils/actionDetector';
import { useToastStore } from '../stores/useToastStore';
import type { Message, DetectedAction } from '../types';

export interface AIAnalysisResult {
  summary: ConversationSummary;
  insights: ConversationInsight[];
  actions: DetectedAction[];
}

// ─── Analysis cache (persists until manual refresh) ──────────────────

const analysisCache = new Map<string, AIAnalysisResult>();

function getCacheKey(conversationId: string, channelId?: string | null): string {
  return `${conversationId}:${channelId ?? 'main'}`;
}

/**
 * Analyze a conversation using either the Claude-powered Supabase Edge Function
 * or the local mock/regex implementations (when config.useMocks is true).
 *
 * Results are cached per conversation+channel and reused until `forceRefresh` is true.
 */
export async function analyzeConversation(
  messages: Message[],
  currentUserId: string,
  getUserName: (id: string) => string,
  conversationId: string,
  channelId?: string | null,
  forceRefresh = false,
): Promise<AIAnalysisResult> {
  const cacheKey = getCacheKey(conversationId, channelId);

  // Return cached result unless refresh is requested
  if (!forceRefresh) {
    const cached = analysisCache.get(cacheKey);
    if (cached) return cached;
  }

  const result = await runAnalysis(messages, currentUserId, getUserName);
  analysisCache.set(cacheKey, result);
  return result;
}

async function runAnalysis(
  messages: Message[],
  currentUserId: string,
  getUserName: (id: string) => string,
): Promise<AIAnalysisResult> {
  if (config.useMocks) {
    return analyzeWithMocks(messages, currentUserId, getUserName);
  }

  try {
    return await analyzeWithLLM(messages, currentUserId, getUserName);
  } catch (error) {
    console.error('[AI] analyzeConversation failed:', error);
    // Fallback to mocks on failure
    useToastStore.getState().show({
      message: 'AI unavailable, showing estimated results',
      type: 'warning',
    });
    return analyzeWithMocks(messages, currentUserId, getUserName);
  }
}

// ─── Mock implementation (existing regex/keyword logic) ──────────────

async function analyzeWithMocks(
  messages: Message[],
  currentUserId: string,
  getUserName: (id: string) => string,
): Promise<AIAnalysisResult> {
  // Run summary (async) and insights + actions (sync) in parallel
  const [summary] = await Promise.all([
    generateMockSummary(messages, getUserName),
  ]);

  const insights = detectInsights(messages, currentUserId, getUserName, new Set());

  // Aggregate actions from recent messages (same logic as InsightsTab had)
  const recentMsgs = messages.slice(-30);
  const allActions: DetectedAction[] = [];
  for (const msg of recentMsgs) {
    if (msg.type === 'text' && msg.senderId !== currentUserId) {
      allActions.push(...detectActions(msg.id, msg.content));
    }
  }
  const seen = new Set<string>();
  const actions = allActions.filter((a) => {
    const key = `${a.type}:${a.extractedValue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { summary, insights, actions };
}

// ─── Real LLM implementation (Supabase Edge Function → Claude) ──────

async function analyzeWithLLM(
  messages: Message[],
  currentUserId: string,
  getUserName: (id: string) => string,
): Promise<AIAnalysisResult> {
  // Prepare messages for the edge function
  const textMessages = messages
    .filter((m) => m.type === 'text' && m.content)
    .slice(-50);

  if (textMessages.length < 3) {
    // Too few messages — fall back to mocks for a sensible response
    return analyzeWithMocks(messages, currentUserId, getUserName);
  }

  const payload = {
    messages: textMessages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      senderName: getUserName(m.senderId),
      timestamp: typeof m.timestamp === 'string'
        ? m.timestamp
        : new Date(m.timestamp).toISOString(),
    })),
    currentUserId,
    currentUserName: getUserName(currentUserId),
  };

  const { data, error } = await supabase.functions.invoke('ai-analyze', {
    body: payload,
  });

  if (error) {
    throw new Error(`Edge function error: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(`AI analysis error: ${data.error}`);
  }

  // Transform response to match existing interfaces
  return transformLLMResponse(data, messages, currentUserId, getUserName);
}

// ─── Response transformation ────────────────────────────────────────

function transformLLMResponse(
  data: Record<string, unknown>,
  messages: Message[],
  _currentUserId: string,
  getUserName: (id: string) => string,
): AIAnalysisResult {
  const raw = data as {
    summary: {
      overview: string;
      keyTopics: string[];
      decisions: string[];
      actionItems: { id: string; text: string; assignee?: string }[];
    };
    insights: {
      type: 'unanswered_question' | 'pending_decision' | 'follow_up';
      messageId: string;
      content: string;
      senderId: string;
      senderName: string;
    }[];
    actions: {
      type: 'reminder' | 'event' | 'expense' | 'link_save';
      label: string;
      extractedValue: string;
      messageId: string;
    }[];
  };

  // Compute client-side metadata that the LLM doesn't need to generate
  const participantIds = [...new Set(messages.map((m) => m.senderId))];
  const sorted = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const summary: ConversationSummary = {
    overview: raw.summary?.overview ?? '',
    keyTopics: raw.summary?.keyTopics ?? [],
    decisions: raw.summary?.decisions ?? [],
    actionItems: (raw.summary?.actionItems ?? []).map((item, i) => ({
      id: item.id || `action-${i + 1}`,
      text: item.text,
      assignee: item.assignee,
    })),
    messageCount: messages.length,
    participantCount: participantIds.length,
    timeSpan: {
      from: sorted[0]?.timestamp ?? new Date(),
      to: sorted[sorted.length - 1]?.timestamp ?? new Date(),
    },
  };

  const insights: ConversationInsight[] = (raw.insights ?? []).map((ins) => ({
    id: `insight-${ins.messageId}`,
    type: ins.type,
    messageId: ins.messageId,
    content: ins.content,
    senderId: ins.senderId,
    senderName: ins.senderName || getUserName(ins.senderId),
    timestamp: new Date(
      messages.find((m) => m.id === ins.messageId)?.timestamp ?? Date.now(),
    ),
  }));

  const actions: DetectedAction[] = (raw.actions ?? []).map((act) => ({
    type: act.type,
    label: act.label,
    extractedValue: act.extractedValue,
    messageId: act.messageId,
  }));

  return { summary, insights, actions };
}
