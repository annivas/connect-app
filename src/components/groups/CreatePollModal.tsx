import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: string[], isMultipleChoice: boolean) => void;
}

export function CreatePollModal({ visible, onClose, onCreatePoll }: Props) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);

  const handleAddOption = () => {
    if (options.length >= 6) return;
    Haptics.selectionAsync();
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    Haptics.selectionAsync();
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleUpdateOption = (index: number, text: string) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const canCreate =
    question.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= 2;

  const handleCreate = () => {
    if (!canCreate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const validOptions = options.filter((o) => o.trim().length > 0);
    onCreatePoll(question.trim(), validOptions, isMultipleChoice);
    // Reset state
    setQuestion('');
    setOptions(['', '']);
    setIsMultipleChoice(false);
    onClose();
  };

  const handleCancel = () => {
    setQuestion('');
    setOptions(['', '']);
    setIsMultipleChoice(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-background-primary">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <Pressable onPress={handleCancel}>
            <Text className="text-text-secondary text-[16px]">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary text-[17px] font-semibold">Create Poll</Text>
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate}
            style={{ opacity: canCreate ? 1 : 0.4 }}
          >
            <Text className="text-accent-primary text-[16px] font-semibold">Create</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-4">
          {/* Question */}
          <Text className="text-text-secondary text-[13px] font-semibold mb-2 uppercase tracking-wide">
            Question
          </Text>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask a question..."
            placeholderTextColor="#A8937F"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-[15px] mb-6"
            multiline
            maxLength={200}
          />

          {/* Options */}
          <Text className="text-text-secondary text-[13px] font-semibold mb-2 uppercase tracking-wide">
            Options
          </Text>
          {options.map((option, index) => (
            <View key={index} className="flex-row items-center mb-2">
              <View className="flex-1 flex-row items-center bg-surface rounded-xl px-4 py-3">
                <View
                  className="w-5 h-5 rounded-full border-2 border-border mr-3 items-center justify-center"
                >
                  <Text className="text-text-tertiary text-[10px] font-bold">{index + 1}</Text>
                </View>
                <TextInput
                  value={option}
                  onChangeText={(text) => handleUpdateOption(index, text)}
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor="#A8937F"
                  className="flex-1 text-text-primary text-[15px]"
                  maxLength={100}
                />
              </View>
              {options.length > 2 && (
                <Pressable
                  onPress={() => handleRemoveOption(index)}
                  className="ml-2 w-8 h-8 items-center justify-center"
                >
                  <Ionicons name="close-circle" size={22} color="#C94F4F" />
                </Pressable>
              )}
            </View>
          ))}

          {/* Add option button */}
          {options.length < 6 && (
            <Pressable
              onPress={handleAddOption}
              className="flex-row items-center py-3"
            >
              <Ionicons name="add-circle-outline" size={22} color="#D4764E" />
              <Text className="text-accent-primary text-[14px] font-medium ml-2">
                Add Option
              </Text>
            </Pressable>
          )}

          {/* Multiple choice toggle */}
          <View className="flex-row items-center justify-between bg-surface rounded-xl px-4 py-3 mt-4">
            <View>
              <Text className="text-text-primary text-[15px] font-medium">
                Allow multiple answers
              </Text>
              <Text className="text-text-tertiary text-[12px] mt-0.5">
                Members can select more than one option
              </Text>
            </View>
            <Switch
              value={isMultipleChoice}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                setIsMultipleChoice(val);
              }}
              trackColor={{ true: '#D4764E', false: '#E8D5C4' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
