// ─── User ────────────────────────────────────
export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  statusMessage?: string;
  email?: string;
  phone?: string;
}

// ─── Message ─────────────────────────────────
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location';

export interface Reaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: MessageType;
  metadata?: Record<string, unknown>;
  reactions?: Reaction[];
  isRead: boolean;
}

// ─── Shared Objects ──────────────────────────
export type SharedObjectType = 'link' | 'photo' | 'place' | 'song' | 'video' | 'file';

export interface LinkMetadata {
  url: string;
  favicon?: string;
  previewImage?: string;
}

export interface PhotoMetadata {
  url: string;
  width: number;
  height: number;
}

export interface PlaceMetadata {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  rating?: number;
}

export interface SongMetadata {
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  spotifyUrl?: string;
}

export interface SharedObject {
  id: string;
  type: SharedObjectType;
  title: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  sharedBy: string;
  sharedAt: Date;
  metadata: LinkMetadata | PhotoMetadata | PlaceMetadata | SongMetadata;
}

// ─── Notes ───────────────────────────────────
export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPrivate: boolean;
  tags?: string[];
}

// ─── Reminders ───────────────────────────────
export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  isCompleted: boolean;
  createdBy: string;
  assignedTo?: string[];
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
}

// ─── Ledger ──────────────────────────────────
export interface LedgerEntry {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  category?: string;
  date: Date;
  isSettled: boolean;
}

// ─── Conversation ────────────────────────────
export interface ConversationMetadata {
  sharedObjects: SharedObject[];
  notes: Note[];
  reminders: Reminder[];
  ledgerBalance: number;
  ledgerEntries: LedgerEntry[];
}

export interface Conversation {
  id: string;
  type: 'individual' | 'group';
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ConversationMetadata;
}

// ─── Events ──────────────────────────────────
export type RSVPStatus = 'going' | 'maybe' | 'declined' | 'pending';

export interface EventAttendee {
  userId: string;
  status: RSVPStatus;
  respondedAt?: Date;
}

export interface GroupEvent {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: PlaceMetadata;
  createdBy: string;
  attendees: EventAttendee[];
  type: 'hangout' | 'trip' | 'sports' | 'other';
}

// ─── Trip ────────────────────────────────────
export type ItineraryItemType = 'activity' | 'accommodation' | 'transport' | 'meal' | 'other';

export interface ItineraryItem {
  id: string;
  day: number;
  time?: string;
  title: string;
  description?: string;
  location?: PlaceMetadata;
  type: ItineraryItemType;
  cost?: number;
}

export interface Trip {
  id: string;
  groupId: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  itinerary: ItineraryItem[];
  budget?: number;
  participants: string[];
}

// ─── Group ───────────────────────────────────
export type GroupType = 'general' | 'trip' | 'sports' | 'project';

export interface GroupMetadata {
  sharedObjects: SharedObject[];
  notes: Note[];
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar: string;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt: Date;
  type: GroupType;
  events?: GroupEvent[];
  trip?: Trip;
  lastActivity: Date;
  isPinned: boolean;
  isMuted: boolean;
  metadata?: GroupMetadata;
}

// ─── Collections ─────────────────────────────
export type CollectionType = 'places' | 'songs' | 'photos' | 'links' | 'mixed';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  type: CollectionType;
  items: SharedObject[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  coverImage?: string;
  isPublic: boolean;
  collaborators?: string[];
}

// ─── Scheduled Messages ──────────────────────
export interface ScheduledMessage {
  id: string;
  conversationId: string;
  content: string;
  scheduledFor: Date;
  createdAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}
