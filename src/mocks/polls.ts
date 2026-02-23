import { Poll } from '../types';
import { CURRENT_USER_ID } from './users';

export const MOCK_POLLS: Record<string, Poll[]> = {
  'group-1': [
    {
      id: 'poll-1',
      question: 'Where should we hike this Saturday?',
      options: [
        { id: 'opt-1a', text: 'Mount Tamalpais', voterIds: [CURRENT_USER_ID, 'user-2'] },
        { id: 'opt-1b', text: 'Lands End Trail', voterIds: ['user-1', 'user-5'] },
        { id: 'opt-1c', text: 'Mission Peak', voterIds: [] },
      ],
      createdBy: 'user-1',
      createdAt: new Date('2026-02-20T08:00:00'),
      isMultipleChoice: false,
      isClosed: false,
    },
  ],
  'group-2': [
    {
      id: 'poll-2',
      question: 'Which hotel do we prefer in Tokyo?',
      options: [
        { id: 'opt-2a', text: 'Park Hyatt (Shinjuku)', voterIds: [CURRENT_USER_ID, 'user-3'] },
        { id: 'opt-2b', text: 'Aman Tokyo (Otemachi)', voterIds: ['user-4'] },
        { id: 'opt-2c', text: 'Hoshinoya (Otemachi)', voterIds: [] },
        { id: 'opt-2d', text: 'Airbnb in Shibuya', voterIds: ['user-1'] },
      ],
      createdBy: 'user-3',
      createdAt: new Date('2026-02-19T10:00:00'),
      isMultipleChoice: false,
      isClosed: false,
    },
    {
      id: 'poll-3',
      question: 'Must-do activities? (select all that apply)',
      options: [
        { id: 'opt-3a', text: 'TeamLab Borderless', voterIds: [CURRENT_USER_ID, 'user-3', 'user-4'] },
        { id: 'opt-3b', text: 'Tsukiji Outer Market', voterIds: [CURRENT_USER_ID, 'user-1', 'user-3'] },
        { id: 'opt-3c', text: 'Meiji Shrine', voterIds: ['user-4'] },
        { id: 'opt-3d', text: 'Robot Restaurant', voterIds: ['user-1', 'user-4'] },
      ],
      createdBy: CURRENT_USER_ID,
      createdAt: new Date('2026-02-19T14:00:00'),
      isMultipleChoice: true,
      isClosed: false,
    },
  ],
};
