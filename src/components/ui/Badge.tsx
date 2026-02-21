import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  count: number;
  variant?: 'primary' | 'muted';
}

export function Badge({ count, variant = 'primary' }: BadgeProps) {
  if (count === 0) return null;

  const display = count > 99 ? '99+' : String(count);
  const bg = variant === 'primary' ? 'bg-accent-primary' : 'bg-text-tertiary';

  return (
    <View
      className={`min-w-[20px] h-5 px-1.5 rounded-full items-center justify-center ${bg}`}
    >
      <Text className="text-white text-[10px] font-semibold">{display}</Text>
    </View>
  );
}
