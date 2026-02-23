import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  visible: boolean;
  onSchedule: (date: Date) => void;
  onClose: () => void;
}

// Quick schedule options with their resolver functions
function getLaterToday(): Date {
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  // If it's already past 6pm, schedule for +2 hours from now
  if (d <= new Date()) {
    return new Date(Date.now() + 2 * 60 * 60 * 1000);
  }
  return d;
}

function getTomorrowMorning(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function getNextMonday(): Date {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(9, 0, 0, 0);
  return d;
}

const QUICK_OPTIONS = [
  { label: 'Later today', sublabel: '6:00 PM', icon: 'sunny-outline' as const, getDate: getLaterToday },
  { label: 'Tomorrow morning', sublabel: '9:00 AM', icon: 'partly-sunny-outline' as const, getDate: getTomorrowMorning },
  { label: 'Next Monday', sublabel: '9:00 AM', icon: 'calendar-outline' as const, getDate: getNextMonday },
];

export function ScheduleMessageSheet({ visible, onSchedule, onClose }: Props) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDate, setCustomDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const handleQuickOption = (getDate: () => Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSchedule(getDate());
    onClose();
  };

  const handleCustomConfirm = () => {
    if (customDate <= new Date()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSchedule(customDate);
    setShowCustomPicker(false);
    onClose();
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setCustomDate(selectedDate);
      // On Android, switch from date to time picker automatically
      if (Platform.OS === 'android' && pickerMode === 'date') {
        setPickerMode('time');
      }
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
        {/* Header */}
        <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-border-subtle">
          <Pressable onPress={onClose} className="mr-3">
            <Ionicons name="close" size={24} color="#A0A0AB" />
          </Pressable>
          <Text className="text-text-primary text-lg font-semibold flex-1">
            Schedule Message
          </Text>
        </View>

        {!showCustomPicker ? (
          <>
            {/* Quick options */}
            <View className="mt-4 mx-4">
              <Text className="text-text-tertiary text-[12px] font-medium uppercase tracking-wide mb-2 ml-1">
                Quick options
              </Text>
              <View className="bg-surface rounded-2xl overflow-hidden border border-border-subtle">
                {QUICK_OPTIONS.map((option, index) => (
                  <Pressable
                    key={option.label}
                    onPress={() => handleQuickOption(option.getDate)}
                    className={`flex-row items-center px-4 py-3.5 ${
                      index < QUICK_OPTIONS.length - 1 ? 'border-b border-border-subtle' : ''
                    } active:bg-surface-hover`}
                  >
                    <View className="w-8 h-8 rounded-full bg-accent-primary/15 items-center justify-center mr-3">
                      <Ionicons name={option.icon} size={18} color="#6366F1" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-text-primary text-[15px] font-medium">
                        {option.label}
                      </Text>
                      <Text className="text-text-tertiary text-[12px] mt-0.5">
                        {option.sublabel}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#6B6B76" />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Custom option */}
            <View className="mt-3 mx-4">
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowCustomPicker(true);
                  setPickerMode('date');
                }}
                className="flex-row items-center px-4 py-3.5 bg-surface rounded-2xl border border-border-subtle active:bg-surface-hover"
              >
                <View className="w-8 h-8 rounded-full bg-accent-secondary/15 items-center justify-center mr-3">
                  <Ionicons name="time-outline" size={18} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="text-text-primary text-[15px] font-medium">
                    Custom date & time
                  </Text>
                  <Text className="text-text-tertiary text-[12px] mt-0.5">
                    Pick a specific date and time
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#6B6B76" />
              </Pressable>
            </View>

            {/* Info text */}
            <View className="mx-4 mt-4 px-3">
              <Text className="text-text-tertiary text-[12px] leading-[16px] text-center">
                Your message will be sent automatically at the scheduled time.
                You can cancel a scheduled message before it's sent.
              </Text>
            </View>
          </>
        ) : (
          /* Custom date/time picker */
          <View className="mt-4 mx-4">
            <Text className="text-text-tertiary text-[12px] font-medium uppercase tracking-wide mb-3 ml-1">
              Pick date & time
            </Text>

            <View className="bg-surface rounded-2xl border border-border-subtle p-4 items-center">
              <DateTimePicker
                value={customDate}
                mode={Platform.OS === 'ios' ? 'datetime' : pickerMode}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={handleDateChange}
                themeVariant="dark"
              />
            </View>

            <View className="flex-row mt-4 gap-3">
              <Pressable
                onPress={() => setShowCustomPicker(false)}
                className="flex-1 py-3 rounded-xl bg-surface-elevated border border-border-subtle items-center"
              >
                <Text className="text-text-secondary text-[15px] font-medium">Back</Text>
              </Pressable>
              <Pressable
                onPress={handleCustomConfirm}
                className="flex-1 py-3 rounded-xl bg-accent-primary items-center"
              >
                <Text className="text-white text-[15px] font-semibold">Schedule</Text>
              </Pressable>
            </View>

            <Text className="text-text-tertiary text-[12px] mt-3 text-center">
              {customDate.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
