import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import type { Message } from '../../types';

interface Props {
  images: Message[];
  isMine: boolean;
  borderRadius?: number;
}

const GAP = 2;
const MAX_DISPLAY = 4;

/**
 * WhatsApp-style photo grid for consecutive image messages from the same sender.
 *
 * Layout rules:
 * - 1 image: full width (capped at 75% of screen)
 * - 2 images: side-by-side, equal width
 * - 3 images: 1 large on left + 2 stacked on right
 * - 4+: 2x2 grid with "+N" overlay on the last cell
 */
export function PhotoGrid({ images, isMine, borderRadius = 16 }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = screenWidth * 0.75 - 24; // account for horizontal padding
  const count = images.length;
  const displayCount = Math.min(count, MAX_DISPLAY);
  const overflow = count - MAX_DISPLAY;

  const getAspectRatio = (msg: Message): number => {
    const w = msg.metadata?.width as number | undefined;
    const h = msg.metadata?.height as number | undefined;
    return w && h ? w / h : 4 / 3;
  };

  if (count === 1) {
    const img = images[0];
    const aspect = getAspectRatio(img);
    return (
      <View style={{ borderRadius, overflow: 'hidden', maxWidth }}>
        <Image
          source={{ uri: img.content }}
          style={{ width: maxWidth, aspectRatio: aspect }}
          contentFit="cover"
          transition={200}
        />
      </View>
    );
  }

  if (count === 2) {
    const cellWidth = (maxWidth - GAP) / 2;
    return (
      <View style={{ flexDirection: 'row', borderRadius, overflow: 'hidden', maxWidth }}>
        <Image
          source={{ uri: images[0].content }}
          style={{ width: cellWidth, height: cellWidth, borderTopLeftRadius: borderRadius, borderBottomLeftRadius: borderRadius }}
          contentFit="cover"
          transition={200}
        />
        <View style={{ width: GAP }} />
        <Image
          source={{ uri: images[1].content }}
          style={{ width: cellWidth, height: cellWidth, borderTopRightRadius: borderRadius, borderBottomRightRadius: borderRadius }}
          contentFit="cover"
          transition={200}
        />
      </View>
    );
  }

  if (count === 3) {
    const leftWidth = maxWidth * 0.6;
    const rightWidth = maxWidth - leftWidth - GAP;
    const rightHeight = (leftWidth - GAP) / 2;
    return (
      <View style={{ flexDirection: 'row', borderRadius, overflow: 'hidden', maxWidth }}>
        <Image
          source={{ uri: images[0].content }}
          style={{ width: leftWidth, height: leftWidth, borderTopLeftRadius: borderRadius, borderBottomLeftRadius: borderRadius }}
          contentFit="cover"
          transition={200}
        />
        <View style={{ width: GAP }} />
        <View style={{ justifyContent: 'space-between' }}>
          <Image
            source={{ uri: images[1].content }}
            style={{ width: rightWidth, height: rightHeight, borderTopRightRadius: borderRadius }}
            contentFit="cover"
            transition={200}
          />
          <View style={{ height: GAP }} />
          <Image
            source={{ uri: images[2].content }}
            style={{ width: rightWidth, height: rightHeight, borderBottomRightRadius: borderRadius }}
            contentFit="cover"
            transition={200}
          />
        </View>
      </View>
    );
  }

  // 4+ images — 2x2 grid
  const cellSize = (maxWidth - GAP) / 2;
  return (
    <View style={{ borderRadius, overflow: 'hidden', maxWidth }}>
      <View style={{ flexDirection: 'row' }}>
        <Image
          source={{ uri: images[0].content }}
          style={{ width: cellSize, height: cellSize, borderTopLeftRadius: borderRadius }}
          contentFit="cover"
          transition={200}
        />
        <View style={{ width: GAP }} />
        <Image
          source={{ uri: images[1].content }}
          style={{ width: cellSize, height: cellSize, borderTopRightRadius: borderRadius }}
          contentFit="cover"
          transition={200}
        />
      </View>
      <View style={{ height: GAP }} />
      <View style={{ flexDirection: 'row' }}>
        <Image
          source={{ uri: images[2].content }}
          style={{ width: cellSize, height: cellSize, borderBottomLeftRadius: borderRadius }}
          contentFit="cover"
          transition={200}
        />
        <View style={{ width: GAP }} />
        <View>
          <Image
            source={{ uri: images[3].content }}
            style={{ width: cellSize, height: cellSize, borderBottomRightRadius: borderRadius }}
            contentFit="cover"
            transition={200}
          />
          {overflow > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: cellSize,
                height: cellSize,
                borderBottomRightRadius: borderRadius,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>
                +{overflow}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
