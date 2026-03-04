import React, { useRef } from 'react';
import { View, TextInput, Text } from 'react-native';
import type { NoteBlock } from '../../types';

interface Props {
  block: NoteBlock;
  index: number;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  onBackspace: () => void;
  onFocus?: () => void;
  autoFocus?: boolean;
}

function getBlockStyle(type: NoteBlock['type']) {
  switch (type) {
    case 'heading1':
      return { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, marginBottom: 2 };
    case 'heading2':
      return { fontSize: 19, fontWeight: '600' as const, lineHeight: 26, marginBottom: 1 };
    case 'bulletList':
    case 'numberedList':
      return { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 };
    default:
      return { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 };
  }
}

function getPlaceholder(type: NoteBlock['type'], index: number) {
  switch (type) {
    case 'heading1': return 'Heading';
    case 'heading2': return 'Subheading';
    case 'bulletList': return 'List item';
    case 'numberedList': return 'List item';
    default: return index === 0 ? 'Start typing...' : '';
  }
}

function BlockPrefix({ type, index, blockIndex }: { type: NoteBlock['type']; index: number; blockIndex: number }) {
  if (type === 'bulletList') {
    return (
      <Text className="text-text-tertiary mr-2 mt-0.5" style={{ fontSize: 15 }}>
        {'\u2022'}
      </Text>
    );
  }
  if (type === 'numberedList') {
    return (
      <Text className="text-text-tertiary mr-2 mt-0.5 font-medium" style={{ fontSize: 15, minWidth: 18 }}>
        {index + 1}.
      </Text>
    );
  }
  return null;
}

export function NoteBlockInput({
  block,
  index,
  onChangeText,
  onSubmitEditing,
  onBackspace,
  onFocus,
  autoFocus,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const blockStyle = getBlockStyle(block.type);
  const hasPrefixIcon = block.type === 'bulletList' || block.type === 'numberedList';
  const indent = block.indent ?? 0;

  return (
    <View
      className="flex-row items-start px-4 py-0.5"
      style={{ paddingLeft: 16 + indent * 20 }}
    >
      {hasPrefixIcon && <BlockPrefix type={block.type} index={index} blockIndex={index} />}
      <TextInput
        ref={inputRef}
        value={block.content}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace' && block.content === '') {
            onBackspace();
          }
        }}
        placeholder={getPlaceholder(block.type, index)}
        placeholderTextColor="#A8937F"
        autoFocus={autoFocus}
        multiline
        blurOnSubmit={block.type !== 'paragraph'}
        className="flex-1 text-text-primary py-0"
        style={{
          fontSize: blockStyle.fontSize,
          fontWeight: blockStyle.fontWeight,
          lineHeight: blockStyle.lineHeight,
        }}
      />
    </View>
  );
}
