/**
 * Adapters: Supabase DB rows (snake_case) → App TypeScript types (camelCase)
 *
 * Each adapter is explicit — no generic snake→camel conversion.
 * This ensures type safety and makes refactoring visible at compile time.
 */

import type { Tables } from '../../lib/database.types';
import type {
  User,
  Message,
  MessageType,
  Reaction,
  Channel,
  Conversation,
  SharedObject,
  SharedObjectType,
  Note,
  Reminder,
  LedgerEntry,
  Group,
  GroupType,
  GroupEvent,
  EventAttendee,
  RSVPStatus,
  Trip,
  ItineraryItem,
  ItineraryItemType,
  Collection,
  CollectionType,
  Poll,
  PollOption,
} from '../../types';

// ─── Profile → User ────────────────────────────

export function adaptProfile(row: Tables<'profiles'>): User {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    avatar: row.avatar_url ?? '',
    status: row.status as User['status'],
    statusMessage: row.status_message ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
  };
}

// ─── Messages ───────────────────────────────────

export function adaptMessage(row: Tables<'messages'>): Message {
  const reactions = Array.isArray(row.reactions)
    ? (row.reactions as Array<{ emoji: string; userId: string; timestamp: string }>).map(
        (r) => ({
          emoji: r.emoji,
          userId: r.userId,
          timestamp: new Date(r.timestamp),
        })
      )
    : [];

  const meta = (row.metadata as Record<string, unknown>) ?? undefined;

  // Extract replyTo from metadata if present
  const replyToData = meta?.replyTo as
    | { messageId: string; content: string; senderName: string }
    | undefined;

  return {
    id: row.id,
    conversationId: row.context_id,
    senderId: row.sender_id,
    content: row.content,
    timestamp: new Date(row.created_at),
    type: row.type as MessageType,
    metadata: meta,
    reactions: reactions.length > 0 ? reactions : undefined,
    replyTo: replyToData ?? undefined,
    isEdited: meta?.edited === true,
    isRead: row.is_read,
    channelId: row.channel_id ?? undefined,
  };
}

// ─── Channels ───────────────────────────────────

export function adaptChannel(row: Tables<'channels'>): Channel {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji ?? undefined,
    color: row.color,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    metadata: {
      sharedObjects: [],
      notes: [],
      reminders: [],
      ledgerBalance: 0,
      ledgerEntries: [],
      pinnedMessages: [],
      starredMessages: [],
      polls: [],
      callHistory: [],
    },
  };
}

// ─── Shared Objects ─────────────────────────────

export function adaptSharedObject(row: Tables<'shared_objects'>): SharedObject {
  return {
    id: row.id,
    type: row.type as SharedObjectType,
    title: row.title,
    description: row.description ?? undefined,
    url: row.url ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
    sharedBy: row.shared_by,
    sharedAt: new Date(row.shared_at),
    metadata: row.metadata as unknown as SharedObject['metadata'],
  };
}

// ─── Notes ──────────────────────────────────────

export function adaptNote(row: Tables<'notes'>): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    blocks: (row as any).blocks ?? [{ id: `block-${row.id}`, type: 'paragraph', content: row.content }],
    color: row.color,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    isPrivate: row.is_private,
    isPinned: (row as any).is_pinned ?? false,
    tags: row.tags ?? undefined,
  };
}

// ─── Reminders ──────────────────────────────────

export function adaptReminder(row: Tables<'reminders'>): Reminder {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    dueDate: new Date(row.due_date),
    isCompleted: row.is_completed,
    createdBy: row.created_by,
    assignedTo: row.assigned_to ?? undefined,
    createdAt: new Date(row.created_at),
    priority: row.priority as Reminder['priority'],
  };
}

// ─── Ledger ─────────────────────────────────────

export function adaptLedgerEntry(row: Tables<'ledger_entries'>): LedgerEntry {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    paidBy: row.paid_by,
    splitBetween: row.split_between,
    category: row.category ?? undefined,
    date: new Date(row.date),
    isSettled: row.is_settled,
  };
}

// ─── Polls ─────────────────────────────────────

export interface PollRow {
  id: string;
  group_id: string;
  question: string;
  options: unknown;
  created_by: string;
  created_at: string;
  is_multiple_choice: boolean;
  is_closed: boolean;
}

export function adaptPoll(row: PollRow): Poll {
  const options = Array.isArray(row.options)
    ? (row.options as Array<{ id: string; text: string; voterIds: string[] }>).map((o) => ({
        id: o.id,
        text: o.text,
        voterIds: o.voterIds ?? [],
      }))
    : [];

  return {
    id: row.id,
    question: row.question,
    options,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    isMultipleChoice: row.is_multiple_choice,
    isClosed: row.is_closed,
  };
}

// ─── Events ─────────────────────────────────────

export function adaptEventAttendee(row: Tables<'event_attendees'>): EventAttendee {
  return {
    userId: row.user_id,
    status: row.status as RSVPStatus,
    respondedAt: row.responded_at ? new Date(row.responded_at) : undefined,
  };
}

export function adaptGroupEvent(
  row: Tables<'group_events'>,
  attendees: EventAttendee[]
): GroupEvent {
  return {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    description: row.description ?? undefined,
    startDate: new Date(row.start_date),
    endDate: row.end_date ? new Date(row.end_date) : undefined,
    location: (row.location as unknown as GroupEvent['location']) ?? undefined,
    createdBy: row.created_by,
    attendees,
    type: row.type as GroupEvent['type'],
  };
}

// ─── Trips ──────────────────────────────────────

export function adaptItineraryItem(row: Tables<'itinerary_items'>): ItineraryItem {
  return {
    id: row.id,
    day: row.day,
    time: row.time ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    location: (row.location as unknown as ItineraryItem['location']) ?? undefined,
    type: row.type as ItineraryItemType,
    cost: row.cost ?? undefined,
  };
}

export function adaptTrip(
  row: Tables<'trips'>,
  itineraryItems: ItineraryItem[]
): Trip {
  return {
    id: row.id,
    groupId: row.group_id,
    destination: row.destination,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    itinerary: itineraryItems,
    budget: row.budget ?? undefined,
    participants: row.participants,
  };
}

// ─── Conversations (assembled) ──────────────────

export interface ConversationAssemblyData {
  conversation: Tables<'conversations'>;
  participantIds: string[];
  isPinned: boolean;
  isMuted: boolean;
  unreadCount: number;
  lastMessage?: Message;
  sharedObjects: SharedObject[];
  notes: Note[];
  reminders: Reminder[];
  ledgerEntries: LedgerEntry[];
  channels: Channel[];
}

export function adaptConversation(data: ConversationAssemblyData): Conversation {
  const balance = data.ledgerEntries.reduce((sum, entry) => {
    if (entry.isSettled) return sum;
    return sum + entry.amount;
  }, 0);

  return {
    id: data.conversation.id,
    type: data.conversation.type as Conversation['type'],
    participants: data.participantIds,
    lastMessage: data.lastMessage,
    unreadCount: data.unreadCount,
    isPinned: data.isPinned,
    isMuted: data.isMuted,
    createdAt: new Date(data.conversation.created_at),
    updatedAt: new Date(data.conversation.updated_at),
    channels: data.channels.length > 0 ? data.channels : undefined,
    metadata: {
      sharedObjects: data.sharedObjects,
      notes: data.notes,
      reminders: data.reminders,
      ledgerBalance: balance,
      ledgerEntries: data.ledgerEntries,
      pinnedMessages: [],
      starredMessages: [],
      polls: [],
      callHistory: [],
    },
  };
}

// ─── Groups (assembled) ─────────────────────────

export interface GroupAssemblyData {
  group: Tables<'groups'>;
  memberIds: string[];
  adminIds: string[];
  isPinned: boolean;
  isMuted: boolean;
  events: GroupEvent[];
  trip?: Trip;
  sharedObjects: SharedObject[];
  notes: Note[];
  reminders?: Reminder[];
  ledgerEntries?: LedgerEntry[];
  polls?: Poll[];
  channels: Channel[];
}

export function adaptGroup(data: GroupAssemblyData): Group {
  const ledgerEntries = data.ledgerEntries ?? [];
  const ledgerBalance = ledgerEntries.reduce(
    (sum, entry) => (entry.isSettled ? sum : sum + entry.amount),
    0,
  );

  return {
    id: data.group.id,
    name: data.group.name,
    description: data.group.description ?? undefined,
    avatar: data.group.avatar ?? '',
    members: data.memberIds,
    admins: data.adminIds,
    createdBy: data.group.created_by,
    createdAt: new Date(data.group.created_at),
    type: data.group.type as GroupType,
    events: data.events.length > 0 ? data.events : undefined,
    trip: data.trip,
    lastActivity: new Date(data.group.last_activity),
    isPinned: data.isPinned,
    isMuted: data.isMuted,
    unreadCount: 0,
    channels: data.channels.length > 0 ? data.channels : undefined,
    metadata: {
      sharedObjects: data.sharedObjects,
      notes: data.notes,
      reminders: data.reminders ?? [],
      ledgerEntries,
      ledgerBalance,
      pinnedMessages: [],
      starredMessages: [],
      callHistory: [],
    },
  };
}

// ─── Collections (assembled) ────────────────────

export interface CollectionAssemblyData {
  collection: Tables<'collections'>;
  items: SharedObject[];
  collaboratorIds: string[];
}

export function adaptCollection(data: CollectionAssemblyData): Collection {
  return {
    id: data.collection.id,
    name: data.collection.name,
    description: data.collection.description ?? undefined,
    type: data.collection.type as CollectionType,
    items: data.items,
    createdBy: data.collection.created_by,
    createdAt: new Date(data.collection.created_at),
    updatedAt: new Date(data.collection.updated_at),
    coverImage: data.collection.cover_image ?? undefined,
    isPublic: data.collection.is_public,
    collaborators: data.collaboratorIds.length > 0 ? data.collaboratorIds : undefined,
  };
}
