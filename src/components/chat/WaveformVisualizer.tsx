import React, { useMemo } from 'react';
import { View } from 'react-native';

interface Props {
  /** Amplitude samples normalized to 0–1 */
  samples: number[];
  /** How far through playback we are (0–1) */
  progress?: number;
  /** Height of the tallest bar in pixels */
  height?: number;
  /** Number of bars to render (resamples if needed) */
  barCount?: number;
  /** Color for filled (played) bars */
  activeColor?: string;
  /** Color for unfilled (unplayed) bars */
  inactiveColor?: string;
}

/**
 * Visual waveform made of vertical bars. Supports a progress overlay that
 * colours bars left-of-progress in `activeColor` and right-of-progress in
 * `inactiveColor`. Used for both recording preview and voice playback.
 */
export function WaveformVisualizer({
  samples,
  progress = 0,
  height = 28,
  barCount = 40,
  activeColor = '#D4764E',
  inactiveColor = 'rgba(168, 147, 127, 0.4)',
}: Props) {
  // Resample the waveform data to fit the target bar count
  const bars = useMemo(() => {
    if (samples.length === 0) {
      // Return flat bars when no data
      return Array(barCount).fill(0.15);
    }

    if (samples.length === barCount) return samples;

    const resampled: number[] = [];
    const ratio = samples.length / barCount;

    for (let i = 0; i < barCount; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(Math.floor((i + 1) * ratio), samples.length);
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        sum += samples[j];
        count++;
      }
      resampled.push(count > 0 ? sum / count : 0.15);
    }

    return resampled;
  }, [samples, barCount]);

  return (
    <View
      style={{ height, flexDirection: 'row', alignItems: 'center', gap: 1.5 }}
    >
      {bars.map((amplitude, index) => {
        // Clamp amplitude between 0.1 and 1.0 for visual min height
        const clamped = Math.max(0.1, Math.min(1, amplitude));
        const barHeight = clamped * height;
        const isFilled = barCount > 0 && index / barCount <= progress;

        return (
          <View
            key={index}
            style={{
              width: 2.5,
              height: barHeight,
              borderRadius: 1.25,
              backgroundColor: isFilled ? activeColor : inactiveColor,
            }}
          />
        );
      })}
    </View>
  );
}
