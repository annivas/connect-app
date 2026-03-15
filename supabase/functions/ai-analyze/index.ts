import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@^0.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface IncomingMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
}

interface RequestBody {
  messages: IncomingMessage[];
  currentUserId: string;
  currentUserName: string;
}

interface AnalysisResult {
  summary: {
    overview: string;
    keyTopics: string[];
    decisions: string[];
    actionItems: { id: string; text: string; assignee?: string }[];
  };
  insights: {
    type: "unanswered_question" | "pending_decision" | "follow_up";
    messageId: string;
    content: string;
    senderId: string;
    senderName: string;
  }[];
  actions: {
    type: "reminder" | "event" | "expense" | "link_save";
    label: string;
    extractedValue: string;
    messageId: string;
  }[];
}

function formatTranscript(messages: IncomingMessage[]): string {
  return messages
    .map((m) => {
      const time = new Date(m.timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return `[${time}] ${m.senderName}: ${m.content}`;
    })
    .join("\n");
}

const SYSTEM_PROMPT = `You analyze messaging conversations and extract structured insights. You MUST return ONLY valid JSON matching the exact schema below — no markdown, no explanation, no wrapping.

Schema:
{
  "summary": {
    "overview": "2-3 sentence natural summary of the conversation",
    "keyTopics": ["topic1", "topic2", ...],  // up to 5 short topic labels
    "decisions": ["Person: what was decided", ...],  // up to 5, include who said it
    "actionItems": [{"id": "action-1", "text": "what needs to be done", "assignee": "Person"}, ...]  // up to 6
  },
  "insights": [
    {
      "type": "unanswered_question | pending_decision | follow_up",
      "messageId": "id of the relevant message",
      "content": "the message text (max 80 chars)",
      "senderId": "sender's user ID",
      "senderName": "sender's display name"
    }
  ],
  "actions": [
    {
      "type": "reminder | event | expense | link_save",
      "label": "short action label like 'Create reminder' or 'Log expense · $50'",
      "extractedValue": "the key value (date, amount, URL, or phrase)",
      "messageId": "id of the source message"
    }
  ]
}

Rules:
- "unanswered_question": questions from others that the current user hasn't responded to
- "pending_decision": proposals or options discussed without clear resolution
- "follow_up": commitments the current user made that may need following up on
- "reminder": messages suggesting something to remember or a deadline
- "event": messages mentioning dates, times, or planned activities
- "expense": messages mentioning money, costs, splitting bills, or payments
- "link_save": messages containing URLs worth saving
- Only include insights/actions that are genuinely useful — don't force items
- Truncate content fields to 80 characters max
- For actionItems, use sequential IDs: "action-1", "action-2", etc.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { messages, currentUserId, currentUserName } =
      (await req.json()) as RequestBody;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Limit to last 50 text messages to keep token count reasonable
    const recentMessages = messages.slice(-50);
    const transcript = formatTranscript(recentMessages);

    const userPrompt = `Analyze this conversation. The current user is "${currentUserName}" (ID: "${currentUserId}").

Conversation transcript:
${transcript}

Return the JSON analysis now.`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse and validate the JSON response
    const result: AnalysisResult = JSON.parse(textBlock.text);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
