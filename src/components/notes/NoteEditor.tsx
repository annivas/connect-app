import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, TextInput, ScrollView, Keyboard, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { NoteFormatToolbar } from './NoteFormatToolbar';
import { NoteBlockInput } from './NoteBlockInput';
import { ChecklistBlock } from './ChecklistBlock';
import { AttachmentBlock } from './AttachmentBlock';
import type { NoteBlock, NoteBlockType } from '../../types';
import { applyInlineFormat } from '../../utils/inlineFormatting';
import type { InlineFormat } from '../../utils/inlineFormatting';

interface Props {
  title: string;
  blocks: NoteBlock[];
  onTitleChange: (title: string) => void;
  onBlocksChange: (blocks: NoteBlock[]) => void;
}

function generateBlockId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function createBlock(type: NoteBlockType, content = ''): NoteBlock {
  return {
    id: generateBlockId(),
    type,
    content,
    ...(type === 'checklist' ? { checked: false } : {}),
  };
}

/** Derive plain-text content from blocks for search/preview */
export function blocksToPlainText(blocks: NoteBlock[]): string {
  return blocks
    .filter((b) => b.type !== 'image' && b.type !== 'file')
    .map((b) => b.content)
    .join('\n')
    .trim();
}

export function NoteEditor({ title, blocks, onTitleChange, onBlocksChange }: Props) {
  const [focusedBlockIndex, setFocusedBlockIndex] = useState<number | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [newBlockIndex, setNewBlockIndex] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const [controlledSelection, setControlledSelection] = useState<{ blockIndex: number; selection: { start: number; end: number } } | null>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const updateBlock = useCallback(
    (index: number, updates: Partial<NoteBlock>) => {
      const updated = blocks.map((b, i) => (i === index ? { ...b, ...updates } : b));
      onBlocksChange(updated);
    },
    [blocks, onBlocksChange],
  );

  const insertBlockAfter = useCallback(
    (index: number, type?: NoteBlockType) => {
      const currentType = blocks[index]?.type ?? 'paragraph';
      // Continue the same list type, or default to paragraph
      const newType =
        type ?? (['bulletList', 'numberedList', 'checklist'].includes(currentType) ? currentType : 'paragraph');
      const newBlock = createBlock(newType);
      const updated = [...blocks];
      updated.splice(index + 1, 0, newBlock);
      onBlocksChange(updated);
      setNewBlockIndex(index + 1);
    },
    [blocks, onBlocksChange],
  );

  const removeBlock = useCallback(
    (index: number) => {
      if (blocks.length <= 1) {
        // Don't remove the last block, just clear it
        updateBlock(0, { content: '', type: 'paragraph' });
        return;
      }
      const updated = blocks.filter((_, i) => i !== index);
      onBlocksChange(updated);
      // Focus previous block
      setFocusedBlockIndex(Math.max(0, index - 1));
    },
    [blocks, onBlocksChange, updateBlock],
  );

  const handleChangeBlockType = useCallback(
    (type: NoteBlockType) => {
      if (focusedBlockIndex == null) {
        // Add a new block at end
        const newBlock = createBlock(type);
        onBlocksChange([...blocks, newBlock]);
        setNewBlockIndex(blocks.length);
        return;
      }
      updateBlock(focusedBlockIndex, {
        type,
        ...(type === 'checklist' ? { checked: false } : { checked: undefined }),
      });
    },
    [focusedBlockIndex, blocks, onBlocksChange, updateBlock],
  );

  const handleAddImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const imageBlock = createBlock('image');
      imageBlock.metadata = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType ?? 'image/jpeg',
      };
      const insertAt = (focusedBlockIndex ?? blocks.length - 1) + 1;
      const updated = [...blocks];
      updated.splice(insertAt, 0, imageBlock);
      onBlocksChange(updated);
    } catch {
      Alert.alert('Error', 'Could not pick image');
    }
  }, [blocks, focusedBlockIndex, onBlocksChange]);

  const handleAddFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const fileBlock = createBlock('file');
      fileBlock.content = asset.name;
      fileBlock.metadata = {
        uri: asset.uri,
        fileName: asset.name,
        fileSize: asset.size,
        mimeType: asset.mimeType ?? 'application/octet-stream',
      };
      const insertAt = (focusedBlockIndex ?? blocks.length - 1) + 1;
      const updated = [...blocks];
      updated.splice(insertAt, 0, fileBlock);
      onBlocksChange(updated);
    } catch {
      Alert.alert('Error', 'Could not pick file');
    }
  }, [blocks, focusedBlockIndex, onBlocksChange]);

  const handleAddLink = useCallback(() => {
    Alert.prompt?.(
      'Add Link',
      'Enter a URL',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (url?: string) => {
            if (!url?.trim()) return;
            const linkBlock = createBlock('link');
            linkBlock.content = url.trim();
            // Extract domain
            try {
              const parsed = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`);
              linkBlock.metadata = {
                url: parsed.href,
                linkTitle: parsed.hostname,
                linkDomain: parsed.hostname,
              };
            } catch {
              linkBlock.metadata = { url: url.trim(), linkTitle: url.trim(), linkDomain: '' };
            }
            const insertAt = (focusedBlockIndex ?? blocks.length - 1) + 1;
            const updated = [...blocks];
            updated.splice(insertAt, 0, linkBlock);
            onBlocksChange(updated);
          },
        },
      ],
      'plain-text',
      '',
      'url',
    );
    // Fallback for Android (Alert.prompt is iOS only)
    if (Platform.OS !== 'ios') {
      const linkBlock = createBlock('link');
      linkBlock.content = '';
      linkBlock.metadata = { url: '', linkTitle: 'New Link', linkDomain: '' };
      const insertAt = (focusedBlockIndex ?? blocks.length - 1) + 1;
      const updated = [...blocks];
      updated.splice(insertAt, 0, linkBlock);
      onBlocksChange(updated);
    }
  }, [blocks, focusedBlockIndex, onBlocksChange]);

  const handleInlineFormat = useCallback((format: InlineFormat) => {
    if (focusedBlockIndex == null) return;
    const block = blocks[focusedBlockIndex];
    if (!block || block.type === 'image' || block.type === 'file' || block.type === 'link') return;

    const result = applyInlineFormat(block.content, selectionRef.current, format);
    updateBlock(focusedBlockIndex, { content: result.text });
    setControlledSelection({ blockIndex: focusedBlockIndex, selection: result.selection });
    setTimeout(() => setControlledSelection(null), 50);
  }, [focusedBlockIndex, blocks, updateBlock]);

  const currentBlockType = focusedBlockIndex != null ? blocks[focusedBlockIndex]?.type ?? 'paragraph' : 'paragraph';

  // Track numbered list indices for proper numbering
  let numberedIndex = 0;

  return (
    <View className="flex-1">
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Title */}
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder="Note Title"
          placeholderTextColor="#A8937F"
          className="text-text-primary px-4 pt-4 pb-2"
          style={{ fontSize: 26, fontWeight: '700', lineHeight: 34 }}
          multiline
          blurOnSubmit
          onSubmitEditing={() => {
            if (blocks.length > 0) setFocusedBlockIndex(0);
          }}
        />

        {/* Blocks */}
        {blocks.map((block, index) => {
          const isAutoFocus = index === newBlockIndex;
          // Reset numbered index tracking
          if (block.type === 'numberedList') {
            // Count consecutive numbered blocks before this one
            let count = 0;
            for (let i = index; i >= 0 && blocks[i].type === 'numberedList'; i--) {
              count++;
            }
            numberedIndex = count - 1;
          }

          const handleFocus = () => {
            setFocusedBlockIndex(index);
            // Clear newBlockIndex once focus has landed
            if (isAutoFocus) setNewBlockIndex(null);
          };

          // Attachment blocks (image, file, link)
          if (block.type === 'image' || block.type === 'file' || block.type === 'link') {
            return (
              <AttachmentBlock
                key={block.id}
                block={block}
                onRemove={() => removeBlock(index)}
              />
            );
          }

          // Checklist blocks
          if (block.type === 'checklist') {
            return (
              <ChecklistBlock
                key={block.id}
                content={block.content}
                checked={block.checked ?? false}
                onChangeText={(text) => updateBlock(index, { content: text })}
                onToggleCheck={() => updateBlock(index, { checked: !block.checked })}
                onSubmitEditing={() => insertBlockAfter(index)}
                onBackspace={() => removeBlock(index)}
                onFocus={handleFocus}
                autoFocus={isAutoFocus}
                selection={controlledSelection?.blockIndex === index ? controlledSelection.selection : undefined}
                onSelectionChange={(sel) => { selectionRef.current = sel; }}
              />
            );
          }

          // Text blocks (paragraph, heading, bullet, numbered)
          return (
            <NoteBlockInput
              key={block.id}
              block={block}
              index={block.type === 'numberedList' ? numberedIndex : index}
              onChangeText={(text) => updateBlock(index, { content: text })}
              onSubmitEditing={() => insertBlockAfter(index)}
              onBackspace={() => removeBlock(index)}
              onFocus={handleFocus}
              autoFocus={isAutoFocus}
              selection={controlledSelection?.blockIndex === index ? controlledSelection.selection : undefined}
              onSelectionChange={(sel) => { selectionRef.current = sel; }}
            />
          );
        })}
      </ScrollView>

      <NoteFormatToolbar
        currentBlockType={currentBlockType}
        onChangeBlockType={handleChangeBlockType}
        onAddImage={handleAddImage}
        onAddFile={handleAddFile}
        onAddLink={handleAddLink}
        onInlineFormat={handleInlineFormat}
        keyboardVisible={keyboardVisible}
        hasFocusedBlock={focusedBlockIndex != null}
      />
    </View>
  );
}
