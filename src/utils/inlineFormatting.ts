export type InlineFormat = 'bold' | 'italic' | 'strikethrough' | 'monospace';

interface SelectionRange {
  start: number;
  end: number;
}

interface FormatResult {
  text: string;
  selection: SelectionRange;
}

const MARKERS: Record<InlineFormat, string> = {
  bold: '**',
  italic: '*',
  strikethrough: '~~',
  monospace: '`',
};

export function applyInlineFormat(
  text: string,
  selection: SelectionRange,
  format: InlineFormat,
): FormatResult {
  const marker = MARKERS[format];
  const mLen = marker.length;
  const { start, end } = selection;

  if (start === end) {
    // No selection: insert paired markers at cursor, place cursor between them
    const before = text.slice(0, start);
    const after = text.slice(start);
    return {
      text: `${before}${marker}${marker}${after}`,
      selection: { start: start + mLen, end: start + mLen },
    };
  }

  const selectedText = text.slice(start, end);

  // Check if selected text is already wrapped (markers inside selection)
  if (
    selectedText.length > mLen * 2 &&
    selectedText.startsWith(marker) &&
    selectedText.endsWith(marker)
  ) {
    const unwrapped = selectedText.slice(mLen, -mLen);
    return {
      text: text.slice(0, start) + unwrapped + text.slice(end),
      selection: { start, end: start + unwrapped.length },
    };
  }

  // Check if markers exist just outside the selection
  const outerStart = start - mLen;
  const outerEnd = end + mLen;
  if (
    outerStart >= 0 &&
    outerEnd <= text.length &&
    text.slice(outerStart, start) === marker &&
    text.slice(end, outerEnd) === marker
  ) {
    return {
      text: text.slice(0, outerStart) + selectedText + text.slice(outerEnd),
      selection: { start: outerStart, end: outerStart + selectedText.length },
    };
  }

  // Wrap selection with markers
  const wrapped = `${marker}${selectedText}${marker}`;
  return {
    text: text.slice(0, start) + wrapped + text.slice(end),
    selection: { start: start + mLen, end: end + mLen },
  };
}
