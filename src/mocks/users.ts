import { User } from '../types';

export const CURRENT_USER_ID = 'current-user';

export const MOCK_USERS: User[] = [
  {
    id: CURRENT_USER_ID,
    name: 'You',
    username: '@you',
    avatar: 'https://i.pravatar.cc/150?img=68',
    status: 'online',
    statusMessage: 'Building the future',
    email: 'you@connect.app',
    phone: '+1 (415) 555-0123',
  },
  {
    id: 'user-1',
    name: 'Sarah Chen',
    username: '@sarahc',
    avatar: 'https://i.pravatar.cc/150?img=47',
    status: 'online',
    statusMessage: 'Building cool stuff',
  },
  {
    id: 'user-2',
    name: 'Alex Rivera',
    username: '@alexr',
    avatar: 'https://i.pravatar.cc/150?img=12',
    status: 'online',
    statusMessage: 'Coffee first',
  },
  {
    id: 'user-3',
    name: 'Jamie Lee',
    username: '@jamiel',
    avatar: 'https://i.pravatar.cc/150?img=32',
    status: 'away',
    statusMessage: 'In a meeting',
  },
  {
    id: 'user-4',
    name: 'Morgan Taylor',
    username: '@morgant',
    avatar: 'https://i.pravatar.cc/150?img=56',
    status: 'offline',
  },
  {
    id: 'user-5',
    name: 'Jordan Kim',
    username: '@jordank',
    avatar: 'https://i.pravatar.cc/150?img=15',
    status: 'online',
    statusMessage: 'Exploring the world',
  },
];

export const getUserById = (id: string): User | undefined =>
  MOCK_USERS.find((u) => u.id === id);
