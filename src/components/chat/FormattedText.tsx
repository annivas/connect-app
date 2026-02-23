import React from 'react';
import { Text } from 'react-native';
import { parseFormattedText } from '../../utils/textFormatting';
import type { Mention } from '../../types';

interface Props {
  text: string;
  mentions?: Mention[];
  isMine: boolean;
  baseClassName?: string;
}

export function FormattedText({ text, mentions, isMine, baseClassName }: Props) {
  const tokens = parseFormattedText(text, mentions);
  const baseColor = isMine ? 'text-white' : 'text-text-primary';
  const className = baseClassName || `text-[15px] leading-[21px] ${baseColor}`;

  return (
    <Text className={className}>
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'bold':
            return (
              <Text key={i} style={{ fontWeight: '700' }}>
                {token.content}
              </Text>
            );
          case 'italic':
            return (
              <Text key={i} style={{ fontStyle: 'italic' }}>
                {token.content}
              </Text>
            );
          case 'strikethrough':
            return (
              <Text key={i} style={{ textDecorationLine: 'line-through' }}>
                {token.content}
              </Text>
            );
          case 'monospace':
            return (
              <Text
                key={i}
                className={`${isMine ? 'bg-white/15' : 'bg-surface-hover'}`}
                style={{ fontFamily: 'Courier', fontSize: 13 }}
              >
                {' '}{token.content}{' '}
              </Text>
            );
          case 'mention':
            return (
              <Text
                key={i}
                className="text-accent-primary"
                style={{ fontWeight: '600' }}
              >
                {token.content}
              </Text>
            );
          default:
            return <Text key={i}>{token.content}</Text>;
        }
      })}
    </Text>
  );
}
