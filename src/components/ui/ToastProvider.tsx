import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '../../stores/useToastStore';
import { Toast } from './Toast';

export function ToastProvider() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 4,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </View>
  );
}
