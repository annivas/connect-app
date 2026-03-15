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

const SYSTEM_PROMPT = `You analyze messaging conversations and extract structured insights. Use the submit_analysis tool to return your results.

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
- For actionItems, use sequential IDs: "action-1", "action-2", etc.
- overview should be 2-3 sentences
- keyTopics: up to 5 short topic labels
- decisions: up to 5, include who said it (e.g. "Person: what was decided")
- actionItems: up to 6`;

// Tool definition for structured output — guarantees valid JSON
const ANALYSIS_TOOL: Anthropic.Tool = {
  name: "submit_analysis",
  description: "Submit the structured conversation analysis results",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "object",
        properties: {
          overview: { type: "string", description: "2-3 sentence natural summary" },
          keyTopics: { type: "array", items: { type: "string" }, description: "Up to 5 short topic labels" },
          decisions: { type: "array", items: { type: "string" }, description: "Decisions made, with who said it" },
          actionItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                assignee: { type: "string" },
              },
              required: ["id", "text"],
            },
          },
        },
        required: ["overview", "keyTopics", "decisions", "actionItems"],
      },
      insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["unanswered_question", "pending_decision", "follow_up"] },
            messageId: { type: "string" },
            content: { type: "string" },
            senderId: { type: "string" },
            senderName: { type: "string" },
          },
          required: ["type", "messageId", "content", "senderId", "senderName"],
        },
      },
      actions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["reminder", "event", "expense", "link_save"] },
            label: { type: "string" },
            extractedValue: { type: "string" },
            messageId: { type: "string" },
          },
          required: ["type", "label", "extractedValue", "messageId"],
        },
      },
    },
    required: ["summary", "insights", "actions"],
  },
};

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

Use the submit_analysis tool to return the structured analysis.`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "tool", name: "submit_analysis" },
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract tool_use block — guaranteed valid JSON by the API
    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("No tool_use response from Claude");
    }

    const result = toolBlock.input as AnalysisResult;

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
