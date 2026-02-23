import { create } from 'zustand';

interface PlaybackState {
  messageId: string;
  isPlaying: boolean;
  progress: number;
  speed: number;
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
  pauseVoice: () => void;
  setPlaybackSpeed: (speed: number) => void;
  seekVoice: (progress: number) => void;
  stopPlayback: () => void;
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
    set({
      playbackState: {
        messageId,
        isPlaying: true,
        progress: 0,
        speed: 1,
      },
    });
  },

  pauseVoice: () => {
    const { playbackState } = get();
    if (!playbackState) return;
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
    set({ playbackState: null });
  },
}));
