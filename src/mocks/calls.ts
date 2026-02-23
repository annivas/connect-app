import { CallEntry } from '../types';
import { CURRENT_USER_ID } from './users';

function hoursAgo(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d;
}

function daysAgoAt(days: number, hours: number, minutes = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export const MOCK_CALL_HISTORY: CallEntry[] = [
  // Recent call with Sarah — answered, 5 min
  {
    id: 'call-1',
    conversationId: 'conv-1',
    callerId: CURRENT_USER_ID,
    receiverIds: ['user-1'],
    type: 'voice',
    status: 'answered',
    startedAt: hoursAgo(2),
    endedAt: new Date(hoursAgo(2).getTime() + 5 * 60 * 1000),
    duration: 300,
  },
  // Missed call from Alex
  {
    id: 'call-2',
    conversationId: 'conv-2',
    callerId: 'user-2',
    receiverIds: [CURRENT_USER_ID],
    type: 'voice',
    status: 'missed',
    startedAt: hoursAgo(5),
    endedAt: hoursAgo(5),
    duration: 0,
  },
  // Video call with Jamie — answered, 15 min
  {
    id: 'call-3',
    conversationId: 'conv-3',
    callerId: 'user-3',
    receiverIds: [CURRENT_USER_ID],
    type: 'video',
    status: 'answered',
    startedAt: daysAgoAt(1, 14, 0),
    endedAt: daysAgoAt(1, 14, 15),
    duration: 900,
  },
  // Declined call from Jordan
  {
    id: 'call-4',
    conversationId: 'conv-5',
    callerId: 'user-5',
    receiverIds: [CURRENT_USER_ID],
    type: 'voice',
    status: 'declined',
    startedAt: daysAgoAt(2, 18, 30),
    endedAt: daysAgoAt(2, 18, 30),
    duration: 0,
  },
  // Outgoing video call to Sarah — answered, 20 min
  {
    id: 'call-5',
    conversationId: 'conv-1',
    callerId: CURRENT_USER_ID,
    receiverIds: ['user-1'],
    type: 'video',
    status: 'answered',
    startedAt: daysAgoAt(3, 20, 0),
    endedAt: daysAgoAt(3, 20, 20),
    duration: 1200,
  },
];
