import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../ui/Avatar';
import { useGroupsStore } from '../../stores/useGroupsStore';
import { useUserStore } from '../../stores/useUserStore';
import type { EventMessageMetadata } from '../../types';

const EVENT_GREEN = '#2D9F6F';

const EVENT_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  hangout: 'people-outline',
  trip: 'airplane-outline',
  sports: 'football-outline',
  other: 'calendar-outline',
};

const RSVP_COLORS: Record<string, string> = {
  going: '#2D9F6F',
  maybe: '#D4964E',
  declined: '#C94F4F',
  pending: '#A8937F',
};

interface Props {
  metadata: EventMessageMetadata;
  isMine: boolean;
  groupId?: string;
  conversationId?: string;
  onPress?: () => void;
}

export function EventMessageBubble({ metadata, isMine, groupId, onPress }: Props) {
  const currentUserId = useUserStore((s) => s.currentUser?.id);
  const getUserById = useUserStore.getState().getUserById;

  // Read live event data from group store
  const liveEvent = groupId
    ? useGroupsStore((s) => {
        const group = s.groups.find((g) => g.id === groupId);
        return (group?.events ?? []).find((e) => e.id === metadata.eventId);
      })
    : null;

  const attendees = liveEvent?.attendees ?? metadata.attendees;
  const currentUserRsvp = attendees.find((a: any) => a.userId === currentUserId)?.status;

  const handleRsvp = useCallback((status: string) => {
    if (!groupId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useGroupsStore.getState().updateRSVP(groupId, metadata.eventId, status as any);
  }, [groupId, metadata.eventId]);

  // Format date
  let formattedDate = '';
  try {
    formattedDate = format(new Date(metadata.startDate), 'EEE, MMM d · h:mm a');
  } catch {
    formattedDate = metadata.startDate;
  }

  // Color scheme
  const accentColor = isMine ? '#FFFFFF' : EVENT_GREEN;
  const primaryText = isMine ? '#FFFFFF' : '#2D1F14';
  const secondaryText = isMine ? 'rgba(255,255,255,0.6)' : '#7A6355';
  const iconName = EVENT_TYPE_ICONS[metadata.type] ?? 'calendar-outline';

  // Visible attendees
  const goingAttendees = attendees.filter((a: any) => a.status === 'going');
  const visibleAttendees = goingAttendees.slice(0, 4);
  const overflowCount = goingAttendees.length - 4;

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={!onPress} style={{ minWidth: 250 }}>
      {/* Top accent strip */}
      <View
        style={{
          height: 3,
          borderRadius: 1.5,
          backgroundColor: accentColor,
          marginBottom: 10,
          opacity: 0.6,
        }}
      />

      {/* Header: icon badge + EVENT label + type */}
      <View className="flex-row items-center mb-2.5">
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : 'rgba(45,159,111,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={iconName} size={16} color={accentColor} />
        </View>
        <View className="ml-2">
          <Text
            style={{ fontSize: 11, fontWeight: '700', color: accentColor, letterSpacing: 1 }}
          >
            EVENT
          </Text>
          <Text style={{ fontSize: 10, color: secondaryText, textTransform: 'capitalize' }}>
            {metadata.type}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text
        style={{ fontSize: 16, fontWeight: '700', color: primaryText, marginBottom: 8 }}
        numberOfLines={2}
      >
        {metadata.title}
      </Text>

      {/* Description */}
      {metadata.description ? (
        <Text
          style={{ fontSize: 13, color: secondaryText, marginBottom: 8 }}
          numberOfLines={2}
        >
          {metadata.description}
        </Text>
      ) : null}

      {/* Info rows in a tinted section */}
      <View
        style={{
          backgroundColor: isMine ? 'rgba(255,255,255,0.1)' : 'rgba(45,159,111,0.04)',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginBottom: 10,
        }}
      >
        {/* Date row */}
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={14} color={secondaryText} />
          <Text style={{ fontSize: 13, fontWeight: '500', color: primaryText, marginLeft: 8 }}>
            {formattedDate}
          </Text>
        </View>

        {/* Location row */}
        {metadata.location && (
          <View className="flex-row items-center mt-1.5">
            <Ionicons name="location-outline" size={14} color={secondaryText} />
            <Text
              style={{ fontSize: 13, color: secondaryText, marginLeft: 8, flex: 1 }}
              numberOfLines={1}
            >
              {metadata.location.name || metadata.location.address}
            </Text>
          </View>
        )}
      </View>

      {/* Attendees */}
      {visibleAttendees.length > 0 && (
        <View className="flex-row items-center mb-2.5">
          {visibleAttendees.map((attendee: any, i: number) => {
            const user = getUserById(attendee.userId);
            const statusColor = RSVP_COLORS[attendee.status] ?? RSVP_COLORS.pending;
            return (
              <View key={attendee.userId ?? i} style={{ marginRight: -4, position: 'relative' }}>
                <Avatar uri={user?.avatar ?? ''} size="sm" />
                <View
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: statusColor,
                    borderWidth: 1.5,
                    borderColor: isMine ? '#D4764E' : '#FFFFFF',
                  }}
                />
              </View>
            );
          })}
          {overflowCount > 0 && (
            <Text style={{ fontSize: 11, color: secondaryText, marginLeft: 10 }}>
              +{overflowCount}
            </Text>
          )}
          <Text style={{ fontSize: 11, color: secondaryText, marginLeft: 10 }}>
            {goingAttendees.length} going
          </Text>
        </View>
      )}

      {/* RSVP buttons (only for group events) */}
      {groupId && (
        <View className="flex-row" style={{ gap: 6 }}>
          {(['going', 'maybe', 'declined'] as const).map((status) => {
            const isSelected = currentUserRsvp === status;
            const label = status === 'declined' ? 'Decline' : status.charAt(0).toUpperCase() + status.slice(1);
            const statusColor = RSVP_COLORS[status];

            return (
              <Pressable
                key={status}
                onPress={() => handleRsvp(status)}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 8,
                  backgroundColor: isSelected
                    ? (isMine ? 'rgba(255,255,255,0.25)' : `${statusColor}15`)
                    : (isMine ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)'),
                  borderWidth: isSelected ? 1.5 : 0,
                  borderColor: isSelected ? (isMine ? 'rgba(255,255,255,0.4)' : statusColor) : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected ? (isMine ? '#FFFFFF' : statusColor) : secondaryText,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}
