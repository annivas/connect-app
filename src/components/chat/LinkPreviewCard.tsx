import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { extractDomain, isLocationUrl } from '../../utils/urlDetection';

interface Props {
  url: string;
  isMine: boolean;
}

export function LinkPreviewCard({ url, isMine }: Props) {
  const domain = extractDomain(url);
  const isLocation = isLocationUrl(url);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  const icon: keyof typeof Ionicons.glyphMap = isLocation ? 'location' : 'link';
  const label = isLocation ? `Open in Maps` : `${domain}`;
  const sublabel = isLocation ? domain : url.length > 50 ? url.slice(0, 50) + '...' : url;

  return (
    <Pressable
      onPress={handlePress}
      className={`mt-1.5 rounded-xl p-2.5 flex-row items-center ${
        isMine ? 'bg-white/15' : 'bg-background-secondary/80'
      }`}
    >
      <View
        className={`w-8 h-8 rounded-full items-center justify-center mr-2.5 ${
          isLocation ? 'bg-status-success/20' : 'bg-accent-tertiary/20'
        }`}
      >
        <Ionicons
          name={icon}
          size={16}
          color={isLocation ? '#2D9F6F' : isMine ? '#FFFFFF' : '#5B8EC9'}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-[13px] font-medium ${isMine ? 'text-white' : 'text-text-primary'}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          className={`text-[11px] mt-0.5 ${isMine ? 'text-white/70' : 'text-text-tertiary'}`}
          numberOfLines={1}
        >
          {sublabel}
        </Text>
      </View>
      <Ionicons
        name="open-outline"
        size={14}
        color={isMine ? 'rgba(255,255,255,0.6)' : '#A8937F'}
      />
    </Pressable>
  );
}
