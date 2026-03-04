import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NoteBlock } from '../../types';

interface Props {
  block: NoteBlock;
  onRemove: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageBlock({ block, onRemove }: Props) {
  const uri = block.metadata?.uri;
  if (!uri) return null;

  return (
    <View className="mx-4 my-2 rounded-xl overflow-hidden bg-surface">
      <Image
        source={{ uri }}
        style={{
          width: '100%',
          aspectRatio: (block.metadata?.width && block.metadata?.height)
            ? block.metadata.width / block.metadata.height
            : 4 / 3,
          maxHeight: 300,
        }}
        contentFit="cover"
        transition={200}
      />
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRemove();
        }}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 items-center justify-center"
      >
        <Ionicons name="close" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function FileBlock({ block, onRemove }: Props) {
  const fileName = block.metadata?.fileName ?? 'Untitled file';
  const fileSize = block.metadata?.fileSize;
  const isPDF = block.metadata?.mimeType?.includes('pdf');

  return (
    <View className="mx-4 my-2 flex-row items-center bg-surface rounded-xl px-4 py-3 border border-border-subtle">
      <View className="w-10 h-10 rounded-lg bg-accent-primary/10 items-center justify-center mr-3">
        <Ionicons
          name={isPDF ? 'document-text' : 'document-attach'}
          size={22}
          color="#D4764E"
        />
      </View>
      <View className="flex-1">
        <Text className="text-text-primary text-[14px] font-medium" numberOfLines={1}>
          {fileName}
        </Text>
        {fileSize != null && (
          <Text className="text-text-tertiary text-[12px]">{formatFileSize(fileSize)}</Text>
        )}
      </View>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRemove();
        }}
        hitSlop={8}
      >
        <Ionicons name="close-circle" size={20} color="#A8937F" />
      </Pressable>
    </View>
  );
}

function LinkBlock({ block, onRemove }: Props) {
  const title = block.metadata?.linkTitle ?? block.content;
  const domain = block.metadata?.linkDomain ?? '';
  const url = block.metadata?.url ?? block.content;

  return (
    <View className="mx-4 my-2 bg-surface rounded-xl px-4 py-3 border border-border-subtle">
      <View className="flex-row items-start">
        <View className="w-8 h-8 rounded-lg bg-accent-primary/10 items-center justify-center mr-3 mt-0.5">
          <Ionicons name="link" size={18} color="#D4764E" />
        </View>
        <View className="flex-1">
          <Text className="text-text-primary text-[14px] font-medium" numberOfLines={2}>
            {title}
          </Text>
          <Text className="text-text-tertiary text-[12px] mt-0.5" numberOfLines={1}>
            {domain || url}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRemove();
          }}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={20} color="#A8937F" />
        </Pressable>
      </View>
    </View>
  );
}

export function AttachmentBlock({ block, onRemove }: Props) {
  switch (block.type) {
    case 'image':
      return <ImageBlock block={block} onRemove={onRemove} />;
    case 'file':
      return <FileBlock block={block} onRemove={onRemove} />;
    case 'link':
      return <LinkBlock block={block} onRemove={onRemove} />;
    default:
      return null;
  }
}
