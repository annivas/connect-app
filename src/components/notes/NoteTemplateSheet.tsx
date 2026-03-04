import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { noteTemplates } from '../../data/noteTemplates';
import type { NoteTemplate, NoteTemplateCategory } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (template: NoteTemplate) => void;
  suggestedCategory?: NoteTemplateCategory;
}

const CATEGORY_LABELS: Record<NoteTemplateCategory, string> = {
  general: 'General',
  family: 'Family',
  trips: 'Trips',
  friends: 'Friends',
  sports: 'Sports',
};

const CATEGORY_ORDER: NoteTemplateCategory[] = ['general', 'family', 'trips', 'friends', 'sports'];

export function NoteTemplateSheet({ visible, onClose, onSelect, suggestedCategory }: Props) {
  // Group templates by category, suggested first
  const categories = suggestedCategory
    ? [suggestedCategory, ...CATEGORY_ORDER.filter((c) => c !== suggestedCategory)]
    : CATEGORY_ORDER;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background-primary">
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle">
          <Text className="text-text-primary text-[17px] font-semibold">Choose a Template</Text>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-surface items-center justify-center"
          >
            <Ionicons name="close" size={18} color="#7A6355" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((category) => {
            const templates = noteTemplates.filter((t) => t.category === category);
            if (templates.length === 0) return null;

            return (
              <View key={category} className="mb-6">
                <Text className="text-text-secondary text-[13px] font-semibold uppercase tracking-wider mb-3">
                  {CATEGORY_LABELS[category]}
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onSelect(template);
                        onClose();
                      }}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function TemplateCard({ template, onPress }: { template: NoteTemplate; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-elevated rounded-xl px-4 py-3 border border-border-subtle"
      style={{ width: '48%' }}
    >
      <View className="w-9 h-9 rounded-lg bg-accent-primary/10 items-center justify-center mb-2">
        <Ionicons name={template.icon as any} size={20} color="#D4764E" />
      </View>
      <Text className="text-text-primary text-[14px] font-medium" numberOfLines={1}>
        {template.name}
      </Text>
      <Text className="text-text-tertiary text-[11px] mt-0.5">
        {template.blocks.length} {template.blocks.length === 1 ? 'block' : 'blocks'}
      </Text>
    </Pressable>
  );
}
