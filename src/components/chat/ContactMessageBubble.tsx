import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ContactMessageMetadata } from '../../types';

interface Props {
  metadata: ContactMessageMetadata;
  isMine: boolean;
}

export function ContactMessageBubble({ metadata, isMine }: Props) {
  const handleAddContact = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // In a real app, would open contact creation flow
  };

  const accentText = isMine ? 'text-white' : 'text-text-primary';
  const secondaryText = isMine ? 'text-white/60' : 'text-text-tertiary';

  return (
    <View style={{ minWidth: 200 }}>
      <View className="flex-row items-center py-1">
        {/* Contact avatar */}
        {metadata.avatar ? (
          <Image
            source={{ uri: metadata.avatar }}
            style={{ width: 40, height: 40, borderRadius: 20 }}
            contentFit="cover"
          />
        ) : (
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.15)',
            }}
          >
            <Ionicons name="person" size={20} color={isMine ? '#FFFFFF' : '#6366F1'} />
          </View>
        )}

        {/* Contact info */}
        <View className="flex-1 ml-3">
          <Text className={`text-[14px] font-semibold ${accentText}`}>
            {metadata.name}
          </Text>
          {metadata.phone && (
            <Text className={`text-[12px] mt-0.5 ${secondaryText}`}>
              {metadata.phone}
            </Text>
          )}
          {metadata.email && (
            <Text className={`text-[12px] ${secondaryText}`}>
              {metadata.email}
            </Text>
          )}
        </View>
      </View>

      {/* Add Contact button */}
      <Pressable
        onPress={handleAddContact}
        className={`flex-row items-center justify-center py-2 mt-1.5 rounded-lg ${
          isMine ? 'bg-white/15' : 'bg-surface-hover'
        }`}
      >
        <Ionicons name="person-add-outline" size={14} color={isMine ? '#FFFFFF' : '#6366F1'} />
        <Text
          className={`text-[13px] font-medium ml-1.5 ${
            isMine ? 'text-white' : 'text-accent-primary'
          }`}
        >
          Add Contact
        </Text>
      </Pressable>
    </View>
  );
}
