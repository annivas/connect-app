import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  uri?: string;
  name?: string;
  onClose: () => void;
}

export function AvatarViewer({ visible, uri, name, onClose }: Props) {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
        {/* Tap backdrop to dismiss */}
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <View style={styles.content} onStartShouldSetResponder={() => true}>
            {/* Close button */}
            <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={8}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>

            {/* Avatar image */}
            {uri ? (
              <Image
                source={{ uri }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.fallback}>
                {name ? (
                  <Text style={styles.fallbackInitial}>
                    {name[0].toUpperCase()}
                  </Text>
                ) : (
                  <Ionicons name="person" size={120} color="#FFFFFF" />
                )}
              </View>
            )}

            {/* Name label */}
            {name && (
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
            )}
          </View>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  closeButton: {
    position: 'absolute',
    top: -80,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  fallback: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#C2956B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 100,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
});
