import React from 'react';
import { Text } from 'react-native';

/**
 * Splits `text` by `highlight` (case-insensitive) and renders matching parts
 * with a warm highlight background. Returns a React node ready for use inside
 * a parent `<Text>` component.
 *
 * If `highlight` is empty, returns the plain text.
 */
export function renderHighlightedText(
  text: string,
  highlight: string,
  baseClassName: string,
): React.ReactNode {
  if (!highlight || highlight.length === 0) {
    return <Text className={baseClassName}>{text}</Text>;
  }

  // Escape regex special characters in the search term
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) {
    // No match found
    return <Text className={baseClassName}>{text}</Text>;
  }

  return (
    <Text className={baseClassName}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === highlight.toLowerCase();
        if (isMatch) {
          return (
            <Text key={index} className="bg-status-warning/40 font-semibold">
              {part}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}
