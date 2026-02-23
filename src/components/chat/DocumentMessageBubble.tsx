import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { DocumentMessageMetadata } from '../../types';

interface Props {
  metadata: DocumentMessageMetadata;
  isMine: boolean;
}

const FILE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  'application/pdf': { icon: 'document-text', color: '#EF4444' },
  'application/msword': { icon: 'document-text', color: '#3B82F6' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: 'document-text', color: '#3B82F6' },
  'application/vnd.ms-excel': { icon: 'grid', color: '#10B981' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: 'grid', color: '#10B981' },
  'text/plain': { icon: 'document-outline', color: '#6B6B76' },
  'application/zip': { icon: 'file-tray-stacked', color: '#F59E0B' },
};

function getFileIcon(mimeType: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  return FILE_ICONS[mimeType] || { icon: 'document-outline', color: '#6B6B76' };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentMessageBubble({ metadata, isMine }: Props) {
  const { icon, color } = getFileIcon(metadata.mimeType);

  const handleDownload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // In a real app, would open the document or download it
  };

  return (
    <Pressable onPress={handleDownload} className="flex-row items-center py-1" style={{ minWidth: 200 }}>
      {/* File type icon */}
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: `${color}20` }}
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>

      {/* File info */}
      <View className="flex-1 mr-2">
        <Text
          className={`text-[14px] font-medium ${isMine ? 'text-white' : 'text-text-primary'}`}
          numberOfLines={1}
        >
          {metadata.fileName}
        </Text>
        <Text className={`text-[11px] mt-0.5 ${isMine ? 'text-white/60' : 'text-text-tertiary'}`}>
          {formatFileSize(metadata.fileSize)} · {metadata.mimeType.split('/').pop()?.toUpperCase()}
        </Text>
      </View>

      {/* Download icon */}
      <Ionicons
        name="download-outline"
        size={18}
        color={isMine ? 'rgba(255,255,255,0.6)' : '#A0A0AB'}
      />
    </Pressable>
  );
}
