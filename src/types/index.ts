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
  richStatus?: RichStatus;
  lastSeenAt?: Date;
  birthday?: Date;
  isAI?: boolean;
}

// ─── Message ─────────────────────────────────
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact' | 'song' | 'note' | 'reminder' | 'expense' | 'poll' | 'event';

export interface Reaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface MessageReplyTo {
  messageId: string;
  content: string;
  senderName: string;
}

export interface ForwardedFrom {
  originalMessageId: string;
  originalSenderId: string;
  originalSenderName: string;
  originalConversationId: string;
  originalTimestamp: Date;
}

export interface Mention {
  userId: string;
  displayName: string;
  offset: number;
  length: number;
}

export type TextFormatType = 'text' | 'bold' | 'italic' | 'strikethrough' | 'monospace' | 'mention';

export interface TextFormatToken {
  type: TextFormatType;
  content: string;
  mention?: Mention;
}

// ─── Rich Message Metadata ──────────────────
export interface VoiceMessageMetadata {
  duration: number;
  waveformSamples: number[];
  uri: string;
}

export interface LocationMessageMetadata {
  latitude: number;
  longitude: number;
  address: string;
  placeName: string;
  staticMapUrl?: string;
}

export interface DocumentMessageMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  uri: string;
}

export interface ContactMessageMetadata {
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

export interface VideoMessageMetadata {
  uri: string;
  duration: number;
  width: number;
  height: number;
  thumbnailUri?: string;
}

export interface NoteMessageMetadata {
  noteId?: string;
  title: string;
  contentPreview: string;
  isPrivate: boolean;
  color: string;
}

export interface ReminderMessageMetadata {
  reminderId?: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  assignedTo?: string[];
}

export interface ExpenseMessageMetadata {
  entryId?: string;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  category?: string;
  isSettled: boolean;
}

export interface PollMessageMetadata {
  pollId: string;
  question: string;
  options: { id: string; text: string; voterIds: string[] }[];
  isMultipleChoice: boolean;
  isClosed: boolean;
}

export interface EventMessageMetadata {
  eventId: string;
  title: string;
  type: 'hangout' | 'trip' | 'sports' | 'other';
  startDate: string;
  endDate?: string;
  location?: { name: string; address: string };
  description?: string;
  attendees: { userId: string; status: string }[];
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
  replyTo?: MessageReplyTo;
  isEdited?: boolean;
  isRead: boolean;
  sendStatus?: 'sending' | 'sent' | 'delivered' | 'failed';
  isStarred?: boolean;
  isPinned?: boolean;
  forwardedFrom?: ForwardedFrom;
  mentions?: Mention[];
  expiresAt?: Date;
  scheduledFor?: Date;
  isScheduled?: boolean;
  isPrivate?: boolean;
  channelId?: string | null;
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
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  spotifyUrl?: string;
  previewUrl?: string;
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
export type NoteBlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'bulletList'
  | 'numberedList'
  | 'checklist'
  | 'image'
  | 'file'
  | 'link';

export interface NoteAttachmentMeta {
  uri?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  url?: string;
  linkTitle?: string;
  linkDomain?: string;
}

export interface NoteBlock {
  id: string;
  type: NoteBlockType;
  content: string;
  checked?: boolean;
  indent?: number;
  metadata?: NoteAttachmentMeta;
}

export type NoteTemplateCategory = 'general' | 'family' | 'trips' | 'friends' | 'sports';

export interface NoteTemplate {
  id: string;
  name: string;
  category: NoteTemplateCategory;
  icon: string;
  blocks: Omit<NoteBlock, 'id'>[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  blocks: NoteBlock[];
  color: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPrivate: boolean;
  isPinned: boolean;
  tags?: string[];
  templateId?: string;
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
  linkedMessageId?: string;
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
  linkedMessageId?: string;
}

// ─── Conversation Event ──────────────────────
export interface ConversationEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  createdBy: string;
}

// ─── Conversation ────────────────────────────
export interface ConversationMetadata {
  sharedObjects: SharedObject[];
  notes: Note[];
  reminders: Reminder[];
  ledgerBalance: number;
  ledgerEntries: LedgerEntry[];
  pinnedMessages: string[];
  starredMessages: string[];
  polls: Poll[];
  callHistory: CallEntry[];
  events?: ConversationEvent[];
}

// ─── Channels ───────────────────────────────
export interface Channel {
  id: string;
  name: string;
  emoji?: string;
  color: string;
  createdBy: string;
  createdAt: Date;
  metadata: ConversationMetadata;
  aiAgentId?: string;
  aiVisibility?: AIVisibility;
}

export type DisappearingDuration = '30s' | '5m' | '1h' | '24h' | '7d' | 'off';
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
  channels?: Channel[];
  isArchived?: boolean;
  isMarkedUnread?: boolean;
  disappearingDuration?: DisappearingDuration;
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
  eventSpaceId?: string;
}

// ─── Polls ──────────────────────────────────
export interface PollOption {
  id: string;
  text: string;
  voterIds: string[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: Date;
  isMultipleChoice: boolean;
  isClosed: boolean;
}

// ─── Calls ──────────────────────────────────
export type CallType = 'voice' | 'video';
export type CallStatus = 'missed' | 'answered' | 'declined' | 'ongoing';

export interface CallEntry {
  id: string;
  conversationId: string;
  callerId: string;
  receiverIds: string[];
  type: CallType;
  status: CallStatus;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  isGroupCall?: boolean;
  groupId?: string;
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

// ─── Household ──────────────────────────────
export interface Chore {
  id: string;
  title: string;
  assignedTo: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  nextDue: Date;
  lastCompleted?: Date;
  rotationOrder: string[]; // user IDs in rotation
  isCompleted: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: number;
  category?: string;
  addedBy: string;
  addedAt: Date;
  isChecked: boolean;
  checkedBy?: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  paidBy?: string;
  splitBetween: string[];
  isPaid: boolean;
  category: string;
}

export interface HouseholdData {
  chores: Chore[];
  shoppingList: ShoppingItem[];
  recurringBills: RecurringBill[];
}

// ─── Rich Presence & Status ────────────────
export interface FocusMode {
  enabled: boolean;
  autoReply?: string;
}

export interface RichStatus {
  emoji: string;
  text: string;
  expiresAt?: Date;
  focusMode?: FocusMode;
}

// ─── Smart Action Detection ────────────────
export type DetectedActionType = 'reminder' | 'event' | 'expense' | 'link_save';

export interface DetectedAction {
  type: DetectedActionType;
  label: string;
  extractedValue: string;
  messageId: string;
}

// ─── Activity Feed ─────────────────────────
export type ActivityType = 'message' | 'note_created' | 'reminder_completed' | 'expense_settled' | 'shared_object' | 'event_created' | 'poll_created';

export interface ActivityFeedItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  conversationId?: string;
  groupId?: string;
  userId: string;
  timestamp: Date;
  icon: string;
}

// ─── Contact Insights ──────────────────────
export interface ContactInsights {
  userId: string;
  totalMessages: number;
  firstMessageDate: Date;
  messagesThisMonth: number;
  monthlyMessageCounts: { month: string; count: number }[];
  sharedPhotos: SharedObject[];
  sharedPlaces: SharedObject[];
  sharedSongs: SharedObject[];
  totalExpenseExchanged: number;
  currentBalance: number;
  activeReminders: Reminder[];
  notes: Note[];
}

// ─── Smart Collections ─────────────────────
export interface SmartCollection {
  id: string;
  name: string;
  description: string;
  type: CollectionType;
  rule: 'recent_links' | 'all_restaurants' | 'shared_this_week' | 'all_photos';
  items: SharedObject[];
  icon: string;
  color: string;
  isAutoGenerated: true;
}

// ─── Search ────────────────────────────────
export type SearchFilterType = 'all' | 'messages' | 'notes' | 'reminders' | 'expenses' | 'shared';

export interface SearchResult {
  type: SearchFilterType;
  id: string;
  title: string;
  description: string;
  conversationId?: string;
  groupId?: string;
  timestamp: Date;
  contextName: string;
}

// ─── Group ───────────────────────────────────
export type GroupType = 'general' | 'trip' | 'sports' | 'project' | 'household';

export interface GroupMetadata {
  sharedObjects: SharedObject[];
  notes: Note[];
  reminders: Reminder[];
  ledgerEntries: LedgerEntry[];
  ledgerBalance: number;
  pinnedMessages: string[];
  starredMessages: string[];
  callHistory: CallEntry[];
}

export interface GroupPairBalance {
  userId1: string;
  userId2: string;
  amount: number; // positive = userId1 is owed by userId2
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
  household?: HouseholdData;
  lastActivity: Date;
  isPinned: boolean;
  isMuted: boolean;
  isArchived?: boolean;
  isMarkedUnread?: boolean;
  unreadCount: number;
  disappearingDuration?: DisappearingDuration;
  lastMessage?: Message;
  metadata?: GroupMetadata;
  channels?: Channel[];
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
  groupId?: string;
  content: string;
  scheduledFor: Date;
  createdAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}

// ─── AI Agents ──────────────────────────────
export type AIProvider = 'anthropic' | 'openai' | 'google';

export interface AIAgent {
  id: string;
  name: string;
  provider: AIProvider;
  model: string;
  avatar: string;
  description: string;
  color: string;
  isConnected: boolean;
}

export type AIVisibility = 'ai-enabled' | 'ai-restricted';

export interface AISubchat {
  id: string;
  agentId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  aiVisibility: AIVisibility;
  lastMessage?: AIMessage;
}

export interface AIMessage {
  id: string;
  subchatId: string;
  agentId: string;
  senderId: string; // 'current-user' or agentId
  content: string;
  timestamp: Date;
  isFromAI: boolean;
  isRead: boolean;
}

export type AISuggestedActionType = 'meeting' | 'calendar' | 'task' | 'reminder' | 'decision' | 'document';

export interface AISuggestedAction {
  id: string;
  type: AISuggestedActionType;
  label: string;
  description: string;
  messageId: string;
  isApproved: boolean;
  isDismissed: boolean;
}
