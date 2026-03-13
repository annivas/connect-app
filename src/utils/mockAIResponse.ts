/**
 * Generates a mock AI response based on keyword matching in the user's message.
 * Used by both the standalone AI subchat store and in-conversation AI channels.
 */
export function generateMockAIResponse(agentName: string, userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('help') || lower.includes('can you')) {
    return `Of course! I'd be happy to help with that. Could you share a bit more context so I can give you the most useful response?`;
  }

  if (lower.includes('meeting') || lower.includes('schedule')) {
    return `I can help coordinate that. Here's what I'd suggest:\n\n• **Time:** Tomorrow at 3:00 PM\n• **Duration:** 30 minutes\n• **Format:** Video call\n\nWould you like me to create a calendar event with these details?`;
  }

  if (lower.includes('summary') || lower.includes('summarize')) {
    return `Here's a summary of the key points:\n\n1. **Main topic** discussed was the product direction\n2. **Key decisions** were around AI integration approach\n3. **Action items** include drafting the spec and setting up a follow-up meeting\n\nWant me to expand on any of these?`;
  }

  if (lower.includes('idea') || lower.includes('brainstorm')) {
    return `Great question! Here are some ideas to consider:\n\n• **Option A:** Start with a lightweight MVP focused on team chat + AI\n• **Option B:** Build a full collaboration suite from day one\n• **Option C:** Focus on a specific vertical (e.g., startups) first\n\nEach has trade-offs. Which direction resonates most with your vision?`;
  }

  if (lower.includes('plan') || lower.includes('strategy')) {
    return `Here's a structured approach:\n\n1. **Phase 1:** Define the core value proposition\n2. **Phase 2:** Build the minimum viable product\n3. **Phase 3:** Iterate based on user feedback\n\nShall I help break down any of these phases further?`;
  }

  if (lower.includes('thank') || lower.includes('great') || lower.includes('perfect')) {
    return `Happy to help! Let me know if there's anything else you'd like to explore.`;
  }

  return `Thanks for sharing that! Here are my thoughts:\n\nThis is an interesting direction. I think the key consideration is balancing simplicity with capability — you want the experience to feel natural, not overwhelming.\n\nWould you like me to dive deeper into any specific aspect?`;
}
