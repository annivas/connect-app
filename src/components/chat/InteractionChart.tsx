import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  data: { month: string; count: number }[];
}

export function InteractionChart({ data }: Props) {
  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View>
      <Text className="text-text-primary font-bold text-sm mb-3">Message History</Text>
      <View className="flex-row items-end justify-between h-24 bg-surface rounded-2xl px-3 pt-3 pb-2">
        {data.map((item) => {
          const height = Math.max((item.count / maxCount) * 64, 4);
          return (
            <View key={item.month} className="flex-1 items-center mx-0.5">
              <Text className="text-text-tertiary text-[9px] mb-1">{item.count}</Text>
              <View
                className="w-full rounded-t-lg bg-accent-primary/70"
                style={{
                  height,
                  maxWidth: 32,
                }}
              />
              <Text className="text-text-tertiary text-[9px] mt-1">{item.month}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
