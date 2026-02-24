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
  {
    id: 'user-6',
    name: 'Priya Patel',
    username: '@priyap',
    avatar: 'https://i.pravatar.cc/150?img=29',
    status: 'online',
    statusMessage: 'Reading between the lines',
  },
  {
    id: 'user-7',
    name: 'Marcus Johnson',
    username: '@marcusj',
    avatar: 'https://i.pravatar.cc/150?img=53',
    status: 'away',
    statusMessage: 'On a call',
  },
  {
    id: 'user-8',
    name: 'Emma Wilson',
    username: '@emmaw',
    avatar: 'https://i.pravatar.cc/150?img=44',
    status: 'offline',
  },
  {
    id: 'user-9',
    name: 'Lucas Hernandez',
    username: '@lucash',
    avatar: 'https://i.pravatar.cc/150?img=60',
    status: 'online',
    statusMessage: 'Photography is life',
  },
  {
    id: 'user-10',
    name: 'Aisha Rahman',
    username: '@aishar',
    avatar: 'https://i.pravatar.cc/150?img=21',
    status: 'online',
    statusMessage: 'Creating magic',
  },
  {
    id: 'user-11',
    name: 'David Chang',
    username: '@davidc',
    avatar: 'https://i.pravatar.cc/150?img=8',
    status: 'away',
    statusMessage: 'Cooking something up',
  },
];

export const getUserById = (id: string): User | undefined =>
  MOCK_USERS.find((u) => u.id === id);
