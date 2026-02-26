import React, { useState } from 'react';
import { View, Text, Modal, Pressable, useWindowDimensions, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  images: { uri: string; width?: number; height?: number }[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageViewerModal({ visible, images, initialIndex = 0, onClose }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 8, paddingBottom: 8 }}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            hitSlop={12}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
          {images.length > 1 && (
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }}>
              {currentIndex + 1} / {images.length}
            </Text>
          )}
          <View style={{ width: 40 }} />
        </View>

        {/* Image content */}
        {images.length === 1 ? (
          <Pressable onPress={onClose} className="flex-1 items-center justify-center">
            <Image
              source={{ uri: images[0].uri }}
              style={{
                width: screenWidth,
                height: screenHeight * 0.7,
              }}
              contentFit="contain"
              transition={200}
            />
          </Pressable>
        ) : (
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setCurrentIndex(newIndex);
            }}
            keyExtractor={(_, index) => `img-${index}`}
            renderItem={({ item }) => (
              <View style={{ width: screenWidth, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Image
                  source={{ uri: item.uri }}
                  style={{
                    width: screenWidth,
                    height: screenHeight * 0.7,
                  }}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
