import type { TextFormatToken, Mention } from '../types';

/**
 * Parses markdown-style text formatting and mentions into renderable tokens.
 *
 * Supported formatting:
 *   **bold**  *italic*  ~~strikethrough~~  `monospace`
 *
 * Mentions are resolved from the mentions array by offset/length, taking
 * priority over inline formatting.
 */
export function parseFormattedText(text: string, mentions?: Mention[]): TextFormatToken[] {
  if (!text) return [];

  // First pass: split text around mentions (if any)
  const segments = splitByMentions(text, mentions);

  // Second pass: parse formatting in non-mention segments
  const tokens: TextFormatToken[] = [];
  for (const seg of segments) {
    if (seg.type === 'mention') {
      tokens.push(seg);
    } else {
      tokens.push(...parseFormatting(seg.content));
    }
  }

  return tokens;
}

function splitByMentions(text: string, mentions?: Mention[]): TextFormatToken[] {
  if (!mentions || mentions.length === 0) {
    return [{ type: 'text', content: text }];
  }

  // Sort mentions by offset to process left-to-right
  const sorted = [...mentions].sort((a, b) => a.offset - b.offset);
  const tokens: TextFormatToken[] = [];
  let cursor = 0;

  for (const mention of sorted) {
    // Text before this mention
    if (mention.offset > cursor) {
      tokens.push({ type: 'text', content: text.slice(cursor, mention.offset) });
    }

    // The mention itself
    tokens.push({
      type: 'mention',
      content: text.slice(mention.offset, mention.offset + mention.length),
      mention,
    });

    cursor = mention.offset + mention.length;
  }

  // Remaining text after last mention
  if (cursor < text.length) {
    tokens.push({ type: 'text', content: text.slice(cursor) });
  }

  return tokens;
}

// Regex that matches formatting markers in priority order
const FORMAT_REGEX = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(~~(.+?)~~)|(`(.+?)`)/g;

function parseFormatting(text: string): TextFormatToken[] {
  const tokens: TextFormatToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  FORMAT_REGEX.lastIndex = 0;
  while ((match = FORMAT_REGEX.exec(text)) !== null) {
    // Plain text before the match
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      // **bold**
      tokens.push({ type: 'bold', content: match[2] });
    } else if (match[3]) {
      // *italic*
      tokens.push({ type: 'italic', content: match[4] });
    } else if (match[5]) {
      // ~~strikethrough~~
      tokens.push({ type: 'strikethrough', content: match[6] });
    } else if (match[7]) {
      // `monospace`
      tokens.push({ type: 'monospace', content: match[8] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return tokens;
}
