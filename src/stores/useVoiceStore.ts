import { create } from 'zustand';
import { Audio } from 'expo-av';

interface PlaybackState {
  messageId: string;
  contentType: 'voice' | 'song';
  audioUri?: string;
  isPlaying: boolean;
  progress: number;
  speed: number;
  durationMs: number;
}

interface VoiceState {
  // Recording
  isRecording: boolean;
  recordingDuration: number;
  waveformSamples: number[];
  isCancelled: boolean;

  // Playback
  playbackState: PlaybackState | null;

  // Recording methods
  startRecording: () => void;
  stopRecording: () => { duration: number; waveformSamples: number[]; uri: string };
  cancelRecording: () => void;
  updateRecordingDuration: (duration: number) => void;
  addWaveformSample: (sample: number) => void;

  // Playback methods
  playVoice: (messageId: string) => void;
  playSong: (messageId: string, previewUrl: string, durationMs: number) => void;
  pauseVoice: () => void;
  setPlaybackSpeed: (speed: number) => void;
  seekVoice: (progress: number) => void;
  stopPlayback: () => void;
}

// Module-level sound reference for cleanup
let currentSound: Audio.Sound | null = null;

async function unloadCurrentSound() {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // Ignore cleanup errors
    }
    currentSound = null;
  }
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  isRecording: false,
  recordingDuration: 0,
  waveformSamples: [],
  isCancelled: false,
  playbackState: null,

  startRecording: () => {
    set({
      isRecording: true,
      recordingDuration: 0,
      waveformSamples: [],
      isCancelled: false,
    });
  },

  stopRecording: () => {
    const { recordingDuration, waveformSamples } = get();
    set({
      isRecording: false,
      isCancelled: false,
    });
    // Return the recorded data for the caller to create a message
    return {
      duration: recordingDuration,
      waveformSamples: [...waveformSamples],
      uri: `voice-${Date.now()}.m4a`, // Mock URI
    };
  },

  cancelRecording: () => {
    set({
      isRecording: false,
      recordingDuration: 0,
      waveformSamples: [],
      isCancelled: true,
    });
  },

  updateRecordingDuration: (duration) => {
    set({ recordingDuration: duration });
  },

  addWaveformSample: (sample) => {
    set((state) => ({
      waveformSamples: [...state.waveformSamples, sample],
    }));
  },

  playVoice: (messageId) => {
    // Stop any currently playing audio
    unloadCurrentSound();
    set({
      playbackState: {
        messageId,
        contentType: 'voice',
        isPlaying: true,
        progress: 0,
        speed: 1,
        durationMs: 0,
      },
    });
  },

  playSong: async (messageId, previewUrl, durationMs) => {
    // Stop any currently playing audio
    await unloadCurrentSound();

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true },
        (status) => {
          // onPlaybackStatusUpdate — drives real progress
          if (!status.isLoaded) return;

          const state = get();
          if (state.playbackState?.messageId !== messageId) return;

          if (status.didJustFinish) {
            get().stopPlayback();
            return;
          }

          if (status.isPlaying && status.durationMillis) {
            const newProgress =
              status.positionMillis / status.durationMillis;
            set({
              playbackState: {
                ...state.playbackState!,
                progress: newProgress,
                isPlaying: true,
              },
            });
          }
        },
      );

      currentSound = sound;

      set({
        playbackState: {
          messageId,
          contentType: 'song',
          audioUri: previewUrl,
          isPlaying: true,
          progress: 0,
          speed: 1,
          durationMs,
        },
      });
    } catch {
      // If audio fails to load, still show the bubble but without playback
      set({ playbackState: null });
    }
  },

  pauseVoice: async () => {
    const { playbackState } = get();
    if (!playbackState) return;

    if (currentSound && playbackState.contentType === 'song') {
      try {
        await currentSound.pauseAsync();
      } catch {
        // Ignore
      }
    }

    set({
      playbackState: { ...playbackState, isPlaying: false },
    });
  },

  setPlaybackSpeed: (speed) => {
    const { playbackState } = get();
    if (!playbackState) return;
    set({
      playbackState: { ...playbackState, speed },
    });
  },

  seekVoice: (progress) => {
    const { playbackState } = get();
    if (!playbackState) return;
    set({
      playbackState: { ...playbackState, progress },
    });
  },

  stopPlayback: () => {
    unloadCurrentSound();
    set({ playbackState: null });
  },
}));
