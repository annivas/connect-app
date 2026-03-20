import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, Modal, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { useToastStore } from '../../stores/useToastStore';
import type { ConversationEvent } from '../../types';

interface Props {
  events: ConversationEvent[];
  onCreateEvent: (event: Omit<ConversationEvent, 'id'>) => void;
  onUpdateEvent?: (eventId: string, updates: Partial<Pick<ConversationEvent, 'title' | 'description' | 'startDate' | 'endDate' | 'location'>>) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export function EventsTab({ events, onCreateEvent, onUpdateEvent, onDeleteEvent }: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ConversationEvent | null>(null);

  const sorted = [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const handleLongPress = (event: ConversationEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];
    if (onUpdateEvent) {
      options.push({
        text: 'Edit',
        onPress: () => {
          setEditingEvent(event);
          setIsModalVisible(true);
        },
      });
    }
    if (onDeleteEvent) {
      options.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDeleteEvent(event.id);
          useToastStore.getState().show({ message: 'Event deleted', type: 'success' });
        },
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Event', event.title, options);
  };

  const handleFABPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingEvent(null);
    setIsModalVisible(true);
  };

  if (events.length === 0) {
    return (
      <View className="flex-1 bg-background-primary">
        <EmptyState
          icon="calendar-outline"
          title="No events"
          description="Create events to plan meetings and activities"
        />
        <FAB onPress={handleFABPress} />
        <CreateEventModal
          visible={isModalVisible}
          onClose={() => { setIsModalVisible(false); setEditingEvent(null); }}
          onSave={onCreateEvent}
          onUpdate={onUpdateEvent}
          editingEvent={editingEvent}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-primary">
      <FlatList<ConversationEvent>
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const isPast = item.startDate < new Date();
          return (
            <Pressable onLongPress={() => handleLongPress(item)} delayLongPress={500}>
              <Card className="mb-3">
                <View className="flex-row items-start">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: isPast ? '#A8937F20' : '#D4764E20' }}
                  >
                    <Ionicons
                      name="calendar"
                      size={20}
                      color={isPast ? '#A8937F' : '#D4764E'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-[15px] font-medium ${isPast ? 'text-text-tertiary' : 'text-text-primary'}`}>
                      {item.title}
                    </Text>
                    {item.description && (
                      <Text className="text-text-tertiary text-xs mt-0.5" numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <View className="flex-row items-center mt-1.5">
                      <Ionicons name="time-outline" size={11} color="#A8937F" />
                      <Text className="text-text-tertiary text-[11px] ml-1">
                        {format(item.startDate, 'MMM d, yyyy · HH:mm')}
                        {item.endDate ? ` – ${format(item.endDate, 'HH:mm')}` : ''}
                      </Text>
                    </View>
                    {item.location && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="location-outline" size={11} color="#A8937F" />
                        <Text className="text-text-tertiary text-[11px] ml-1">{item.location}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
      <FAB onPress={handleFABPress} />
      <CreateEventModal
        visible={isModalVisible}
        onClose={() => { setIsModalVisible(false); setEditingEvent(null); }}
        onSave={onCreateEvent}
        onUpdate={onUpdateEvent}
        editingEvent={editingEvent}
      />
    </View>
  );
}

function FAB({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-14 right-6 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
      style={{
        shadowColor: '#D4764E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Ionicons name="add" size={28} color="#FFFFFF" />
    </Pressable>
  );
}

// ─── Create/Edit Event Modal ─────────────────

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (event: Omit<ConversationEvent, 'id'>) => void;
  onUpdate?: (eventId: string, updates: Partial<Pick<ConversationEvent, 'title' | 'description' | 'startDate' | 'endDate' | 'location'>>) => void;
  editingEvent?: ConversationEvent | null;
}

function CreateEventModal({ visible, onClose, onSave, onUpdate, editingEvent }: ModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(() => addDays(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDate, setShowEndDate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAndroidStartPicker, setShowAndroidStartPicker] = useState(false);
  const [androidStartMode, setAndroidStartMode] = useState<'date' | 'time'>('date');
  const [showAndroidEndPicker, setShowAndroidEndPicker] = useState(false);
  const [androidEndMode, setAndroidEndMode] = useState<'date' | 'time'>('date');

  const isEditing = !!editingEvent;
  const canSave = title.trim().length > 0 && !isSaving;

  React.useEffect(() => {
    if (visible) {
      if (editingEvent) {
        setTitle(editingEvent.title);
        setDescription(editingEvent.description ?? '');
        setLocation(editingEvent.location ?? '');
        setStartDate(editingEvent.startDate instanceof Date ? editingEvent.startDate : new Date(editingEvent.startDate));
        if (editingEvent.endDate) {
          setEndDate(editingEvent.endDate instanceof Date ? editingEvent.endDate : new Date(editingEvent.endDate));
          setShowEndDate(true);
        } else {
          setEndDate(null);
          setShowEndDate(false);
        }
      } else {
        setTitle('');
        setDescription('');
        setLocation('');
        setStartDate(addDays(new Date(), 1));
        setEndDate(null);
        setShowEndDate(false);
      }
      setIsSaving(false);
    }
  }, [editingEvent, visible]);

  const handleSave = async () => {
    if (!canSave) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate: showEndDate && endDate ? endDate : undefined,
        location: location.trim() || undefined,
      };
      if (isEditing && onUpdate) {
        onUpdate(editingEvent!.id, payload);
      } else {
        onSave({ ...payload, createdBy: '' });
      }
      onClose();
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background-primary">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-accent-primary text-[16px]">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary text-[17px] font-semibold">
            {isEditing ? 'Edit Event' : 'New Event'}
          </Text>
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#D4764E" />
            ) : (
              <Text className={`text-[16px] font-semibold ${canSave ? 'text-accent-primary' : 'text-text-tertiary'}`}>
                {isEditing ? 'Save' : 'Create'}
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardDismissMode="interactive">
          {/* Title */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Event title"
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
            autoFocus={!isEditing}
          />

          {/* Description */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add details..."
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
            multiline
            style={{ minHeight: 60 }}
            textAlignVertical="top"
          />

          {/* Location */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Location (optional)</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Where is it?"
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-5"
          />

          {/* Start Date/Time */}
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Start</Text>
          {Platform.OS === 'ios' ? (
            <View className="bg-surface rounded-xl mb-4 overflow-hidden">
              <DateTimePicker
                value={startDate}
                mode="datetime"
                display="spinner"
                onChange={(_e, date) => { if (date) setStartDate(date); }}
                themeVariant="light"
              />
            </View>
          ) : (
            <>
              <Pressable
                onPress={() => { setAndroidStartMode('date'); setShowAndroidStartPicker(true); }}
                className="bg-surface rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between"
              >
                <Text className="text-text-primary text-[15px]">{format(startDate, 'MMM d, yyyy · h:mm a')}</Text>
                <Ionicons name="calendar-outline" size={18} color="#D4764E" />
              </Pressable>
              {showAndroidStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode={androidStartMode}
                  display="default"
                  onChange={(_e, date) => {
                    setShowAndroidStartPicker(false);
                    if (date) {
                      setStartDate(date);
                      if (androidStartMode === 'date') {
                        setAndroidStartMode('time');
                        setShowAndroidStartPicker(true);
                      }
                    }
                  }}
                />
              )}
            </>
          )}

          {/* End Date toggle */}
          {!showEndDate ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setShowEndDate(true);
                setEndDate(new Date(startDate.getTime() + 2 * 60 * 60 * 1000));
              }}
              className="flex-row items-center mb-5"
            >
              <Ionicons name="add-circle-outline" size={18} color="#D4764E" />
              <Text className="text-accent-primary text-sm font-medium ml-2">Add end time</Text>
            </Pressable>
          ) : (
            <>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider">End</Text>
                <Pressable onPress={() => { setShowEndDate(false); setEndDate(null); }} hitSlop={8}>
                  <Text className="text-status-error text-xs font-medium">Remove</Text>
                </Pressable>
              </View>
              {Platform.OS === 'ios' ? (
                <View className="bg-surface rounded-xl mb-5 overflow-hidden">
                  <DateTimePicker
                    value={endDate ?? new Date(startDate.getTime() + 2 * 60 * 60 * 1000)}
                    mode="datetime"
                    display="spinner"
                    minimumDate={startDate}
                    onChange={(_e, date) => { if (date) setEndDate(date); }}
                    themeVariant="light"
                  />
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => { setAndroidEndMode('date'); setShowAndroidEndPicker(true); }}
                    className="bg-surface rounded-xl px-4 py-3 mb-5 flex-row items-center justify-between"
                  >
                    <Text className="text-text-primary text-[15px]">
                      {format(endDate ?? new Date(startDate.getTime() + 2 * 60 * 60 * 1000), 'MMM d, yyyy · h:mm a')}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color="#D4764E" />
                  </Pressable>
                  {showAndroidEndPicker && (
                    <DateTimePicker
                      value={endDate ?? new Date(startDate.getTime() + 2 * 60 * 60 * 1000)}
                      mode={androidEndMode}
                      display="default"
                      minimumDate={startDate}
                      onChange={(_e, date) => {
                        setShowAndroidEndPicker(false);
                        if (date) {
                          setEndDate(date);
                          if (androidEndMode === 'date') {
                            setAndroidEndMode('time');
                            setShowAndroidEndPicker(true);
                          }
                        }
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
