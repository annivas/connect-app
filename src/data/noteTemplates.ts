import type { NoteTemplate } from '../types';

export const noteTemplates: NoteTemplate[] = [
  // ─── General ─────────────────────────────────
  {
    id: 'tpl-quick-note',
    name: 'Quick Note',
    category: 'general',
    icon: 'document-text-outline',
    blocks: [
      { type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'tpl-checklist',
    name: 'Checklist',
    category: 'general',
    icon: 'checkbox-outline',
    blocks: [
      { type: 'checklist', content: '', checked: false },
      { type: 'checklist', content: '', checked: false },
      { type: 'checklist', content: '', checked: false },
    ],
  },
  {
    id: 'tpl-meeting-notes',
    name: 'Meeting Notes',
    category: 'general',
    icon: 'people-outline',
    blocks: [
      { type: 'heading2', content: 'Attendees' },
      { type: 'bulletList', content: '' },
      { type: 'heading2', content: 'Discussion' },
      { type: 'paragraph', content: '' },
      { type: 'heading2', content: 'Action Items' },
      { type: 'checklist', content: '', checked: false },
      { type: 'checklist', content: '', checked: false },
    ],
  },

  // ─── Family ──────────────────────────────────
  {
    id: 'tpl-medical-info',
    name: 'Medical Info',
    category: 'family',
    icon: 'medical-outline',
    blocks: [
      { type: 'heading1', content: 'Medical Information' },
      { type: 'heading2', content: 'Allergies' },
      { type: 'bulletList', content: '' },
      { type: 'heading2', content: 'Medications' },
      { type: 'bulletList', content: '' },
      { type: 'heading2', content: 'Doctors & Contacts' },
      { type: 'paragraph', content: '' },
      { type: 'heading2', content: 'Insurance Details' },
      { type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'tpl-emergency-contacts',
    name: 'Emergency Contacts',
    category: 'family',
    icon: 'call-outline',
    blocks: [
      { type: 'heading1', content: 'Emergency Contacts' },
      { type: 'heading2', content: 'Primary Contact' },
      { type: 'paragraph', content: 'Name:\nPhone:\nRelationship:' },
      { type: 'heading2', content: 'Secondary Contact' },
      { type: 'paragraph', content: 'Name:\nPhone:\nRelationship:' },
      { type: 'heading2', content: 'Doctor' },
      { type: 'paragraph', content: 'Name:\nPhone:\nAddress:' },
    ],
  },
  {
    id: 'tpl-house-info',
    name: 'House Info',
    category: 'family',
    icon: 'home-outline',
    blocks: [
      { type: 'heading1', content: 'House Information' },
      { type: 'heading2', content: 'WiFi' },
      { type: 'paragraph', content: 'Network:\nPassword:' },
      { type: 'heading2', content: 'Alarm System' },
      { type: 'paragraph', content: 'Code:\nCompany:' },
      { type: 'heading2', content: 'Utilities' },
      { type: 'bulletList', content: 'Electric:' },
      { type: 'bulletList', content: 'Water:' },
      { type: 'bulletList', content: 'Gas:' },
    ],
  },
  {
    id: 'tpl-travel-checklist',
    name: 'Travel Checklist',
    category: 'family',
    icon: 'airplane-outline',
    blocks: [
      { type: 'heading1', content: 'Travel Checklist' },
      { type: 'heading2', content: 'Documents' },
      { type: 'checklist', content: 'Passports', checked: false },
      { type: 'checklist', content: 'Tickets / Boarding passes', checked: false },
      { type: 'checklist', content: 'Hotel confirmations', checked: false },
      { type: 'heading2', content: 'Packing' },
      { type: 'checklist', content: 'Clothes', checked: false },
      { type: 'checklist', content: 'Toiletries', checked: false },
      { type: 'checklist', content: 'Chargers', checked: false },
      { type: 'heading2', content: 'Before Leaving' },
      { type: 'checklist', content: 'Lock doors', checked: false },
      { type: 'checklist', content: 'Turn off appliances', checked: false },
    ],
  },

  // ─── Trips ───────────────────────────────────
  {
    id: 'tpl-itinerary',
    name: 'Itinerary Notes',
    category: 'trips',
    icon: 'map-outline',
    blocks: [
      { type: 'heading1', content: 'Trip Itinerary' },
      { type: 'heading2', content: 'Day 1' },
      { type: 'paragraph', content: '' },
      { type: 'heading2', content: 'Day 2' },
      { type: 'paragraph', content: '' },
      { type: 'heading2', content: 'Day 3' },
      { type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'tpl-packing-list',
    name: 'Packing List',
    category: 'trips',
    icon: 'briefcase-outline',
    blocks: [
      { type: 'heading1', content: 'Packing List' },
      { type: 'heading2', content: 'Essentials' },
      { type: 'checklist', content: 'Phone & charger', checked: false },
      { type: 'checklist', content: 'Wallet & ID', checked: false },
      { type: 'checklist', content: 'Sunscreen', checked: false },
      { type: 'heading2', content: 'Clothes' },
      { type: 'checklist', content: '', checked: false },
      { type: 'heading2', content: 'Toiletries' },
      { type: 'checklist', content: '', checked: false },
    ],
  },
  {
    id: 'tpl-places-to-eat',
    name: 'Places to Eat',
    category: 'trips',
    icon: 'restaurant-outline',
    blocks: [
      { type: 'heading1', content: 'Places to Eat' },
      { type: 'heading2', content: 'Breakfast' },
      { type: 'bulletList', content: '' },
      { type: 'heading2', content: 'Lunch' },
      { type: 'bulletList', content: '' },
      { type: 'heading2', content: 'Dinner' },
      { type: 'bulletList', content: '' },
      { type: 'heading2', content: 'Cafes & Snacks' },
      { type: 'bulletList', content: '' },
    ],
  },

  // ─── Friends ─────────────────────────────────
  {
    id: 'tpl-plans-brainstorm',
    name: 'Plans Brainstorm',
    category: 'friends',
    icon: 'bulb-outline',
    blocks: [
      { type: 'heading1', content: 'Plans Brainstorm' },
      { type: 'heading2', content: 'Ideas' },
      { type: 'bulletList', content: '' },
      { type: 'heading2', content: 'Dates That Work' },
      { type: 'bulletList', content: '' },
      { type: 'heading2', content: 'Budget' },
      { type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'tpl-gift-ideas',
    name: 'Gift Ideas',
    category: 'friends',
    icon: 'gift-outline',
    blocks: [
      { type: 'heading1', content: 'Gift Ideas' },
      { type: 'checklist', content: '', checked: false },
      { type: 'checklist', content: '', checked: false },
      { type: 'checklist', content: '', checked: false },
      { type: 'heading2', content: 'Notes' },
      { type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'tpl-shared-goals',
    name: 'Shared Goals',
    category: 'friends',
    icon: 'trophy-outline',
    blocks: [
      { type: 'heading1', content: 'Shared Goals' },
      { type: 'checklist', content: '', checked: false },
      { type: 'checklist', content: '', checked: false },
      { type: 'heading2', content: 'Progress' },
      { type: 'paragraph', content: '' },
    ],
  },

  // ─── Sports ──────────────────────────────────
  {
    id: 'tpl-game-plan',
    name: 'Game Plan',
    category: 'sports',
    icon: 'clipboard-outline',
    blocks: [
      { type: 'heading1', content: 'Game Plan' },
      { type: 'heading2', content: 'Date & Time' },
      { type: 'paragraph', content: '' },
      { type: 'heading2', content: 'Location' },
      { type: 'paragraph', content: '' },
      { type: 'heading2', content: 'Team / Players' },
      { type: 'bulletList', content: '' },
      { type: 'heading2', content: 'Strategy' },
      { type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'tpl-courts',
    name: 'Courts We Like',
    category: 'sports',
    icon: 'location-outline',
    blocks: [
      { type: 'heading1', content: 'Courts & Venues' },
      { type: 'heading2', content: 'Favorites' },
      { type: 'bulletList', content: '' },
      { type: 'heading2', content: 'Notes' },
      { type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'tpl-schedule',
    name: 'Schedule',
    category: 'sports',
    icon: 'calendar-outline',
    blocks: [
      { type: 'heading1', content: 'Schedule' },
      { type: 'heading2', content: 'Upcoming Games' },
      { type: 'bulletList', content: '' },
      { type: 'heading2', content: 'Practice Times' },
      { type: 'bulletList', content: '' },
    ],
  },
];

export function getTemplatesByCategory(category: NoteTemplate['category']): NoteTemplate[] {
  return noteTemplates.filter((t) => t.category === category);
}

export function getTemplateById(id: string): NoteTemplate | undefined {
  return noteTemplates.find((t) => t.id === id);
}
