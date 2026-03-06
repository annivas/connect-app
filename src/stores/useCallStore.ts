import { create } from 'zustand';
import { CallType, CallEntry } from '../types';
import { getCurrentUserId } from './helpers';

interface ActiveCall {
  id: string;
  type: CallType;
  participants: string[];
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoEnabled: boolean;
  startedAt: Date;
  isGroupCall?: boolean;
  groupId?: string;
}

interface IncomingCall {
  id: string;
  callerId: string;
  type: CallType;
  startedAt: Date;
}

interface CallState {
  isInCall: boolean;
  activeCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  callHistory: CallEntry[];

  initiateCall: (conversationId: string, participantIds: string[], type: CallType) => void;
  initiateGroupCall: (groupId: string, memberIds: string[], type: CallType) => void;
  answerCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleVideo: () => void;
  simulateIncomingCall: (callerId: string, type: CallType) => void;
  reset: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  isInCall: false,
  activeCall: null,
  incomingCall: null,
  callHistory: [],

  initiateCall: (conversationId, participantIds, type) => {
    const callId = `call-${Date.now()}`;
    const currentUserId = getCurrentUserId() || 'unknown';

    const activeCall: ActiveCall = {
      id: callId,
      type,
      participants: participantIds,
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: type === 'video',
      startedAt: new Date(),
    };

    const historyEntry: CallEntry = {
      id: callId,
      conversationId,
      callerId: currentUserId,
      receiverIds: participantIds,
      type,
      status: 'ongoing',
      startedAt: new Date(),
    };

    set({
      isInCall: true,
      activeCall,
      callHistory: [historyEntry, ...get().callHistory],
    });
  },

  initiateGroupCall: (groupId, memberIds, type) => {
    const callId = `call-group-${Date.now()}`;
    const currentUserId = getCurrentUserId() || 'unknown';

    const otherMembers = memberIds.filter((id) => id !== currentUserId);

    const activeCall: ActiveCall = {
      id: callId,
      type,
      participants: otherMembers,
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: type === 'video',
      startedAt: new Date(),
      isGroupCall: true,
      groupId,
    };

    const historyEntry: CallEntry = {
      id: callId,
      conversationId: groupId,
      callerId: currentUserId,
      receiverIds: otherMembers,
      type,
      status: 'ongoing',
      startedAt: new Date(),
      isGroupCall: true,
      groupId,
    };

    set({
      isInCall: true,
      activeCall,
      callHistory: [historyEntry, ...get().callHistory],
    });
  },

  answerCall: () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    const activeCall: ActiveCall = {
      id: incomingCall.id,
      type: incomingCall.type,
      participants: [incomingCall.callerId],
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: incomingCall.type === 'video',
      startedAt: new Date(),
    };

    set({
      isInCall: true,
      activeCall,
      incomingCall: null,
      callHistory: get().callHistory.map((c) =>
        c.id === incomingCall.id ? { ...c, status: 'answered' as const } : c,
      ),
    });
  },

  declineCall: () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    set({
      incomingCall: null,
      callHistory: get().callHistory.map((c) =>
        c.id === incomingCall.id
          ? { ...c, status: 'declined' as const, endedAt: new Date(), duration: 0 }
          : c,
      ),
    });
  },

  endCall: () => {
    const { activeCall } = get();
    if (!activeCall) return;

    const duration = Math.floor((Date.now() - activeCall.startedAt.getTime()) / 1000);

    set({
      isInCall: false,
      activeCall: null,
      callHistory: get().callHistory.map((c) =>
        c.id === activeCall.id
          ? { ...c, status: 'answered' as const, endedAt: new Date(), duration }
          : c,
      ),
    });
  },

  toggleMute: () => {
    const { activeCall } = get();
    if (!activeCall) return;
    set({ activeCall: { ...activeCall, isMuted: !activeCall.isMuted } });
  },

  toggleSpeaker: () => {
    const { activeCall } = get();
    if (!activeCall) return;
    set({ activeCall: { ...activeCall, isSpeakerOn: !activeCall.isSpeakerOn } });
  },

  toggleVideo: () => {
    const { activeCall } = get();
    if (!activeCall) return;
    set({ activeCall: { ...activeCall, isVideoEnabled: !activeCall.isVideoEnabled } });
  },

  simulateIncomingCall: (callerId, type) => {
    const callId = `call-incoming-${Date.now()}`;
    const currentUserId = getCurrentUserId() || 'unknown';

    const incoming: IncomingCall = {
      id: callId,
      callerId,
      type,
      startedAt: new Date(),
    };

    const historyEntry: CallEntry = {
      id: callId,
      conversationId: '', // Will be resolved by caller context
      callerId,
      receiverIds: [currentUserId],
      type,
      status: 'ongoing',
      startedAt: new Date(),
    };

    set({
      incomingCall: incoming,
      callHistory: [historyEntry, ...get().callHistory],
    });

    // Auto-dismiss after 30 seconds (missed call)
    setTimeout(() => {
      const state = get();
      if (state.incomingCall?.id === callId) {
        set({
          incomingCall: null,
          callHistory: state.callHistory.map((c) =>
            c.id === callId
              ? { ...c, status: 'missed' as const, endedAt: new Date(), duration: 0 }
              : c,
          ),
        });
      }
    }, 30_000);
  },

  reset: () => {
    set({
      isInCall: false,
      activeCall: null,
      incomingCall: null,
      callHistory: [],
    });
  },
}));
