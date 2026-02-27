import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Collection } from '../../types';

interface Props {
  visible: boolean;
  collections: Collection[];
  onSave: (collectionId: string) => void;
  onCreateNew: (name: string) => void;
  onClose: () => void;
}

export function SaveToCollectionSheet({ visible, collections, onSave, onCreateNew, onClose }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCreateNew(newName.trim());
    setNewName('');
    setIsCreating(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable
        className="flex-1 justify-end"
        onPress={onClose}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <Pressable onPress={() => {}} className="bg-background-primary rounded-t-3xl">
          <View className="p-4">
            {/* Handle bar */}
            <View className="w-10 h-1 bg-border rounded-full self-center mb-4" />

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-text-primary text-lg font-bold">Save to Collection</Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setIsCreating(true);
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="add" size={18} color="#D4764E" />
                  <Text className="text-accent-primary text-sm font-medium ml-0.5">New</Text>
                </View>
              </Pressable>
            </View>

            {/* Create new collection */}
            {isCreating && (
              <View className="flex-row items-center bg-surface rounded-2xl px-3.5 py-2.5 mb-3">
                <Ionicons name="folder-outline" size={18} color="#D4764E" />
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Collection name..."
                  placeholderTextColor="#A8937F"
                  className="flex-1 text-text-primary text-sm ml-2"
                  autoFocus
                  onSubmitEditing={handleCreate}
                  returnKeyType="done"
                />
                <Pressable onPress={handleCreate}>
                  <Ionicons name="checkmark-circle" size={22} color="#D4764E" />
                </Pressable>
              </View>
            )}

            {/* Existing collections */}
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {collections.map((collection) => (
                <Pressable
                  key={collection.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSave(collection.id);
                    onClose();
                  }}
                  className="active:opacity-80"
                >
                  <View className="flex-row items-center bg-surface rounded-2xl p-3.5 mb-2">
                    <View className="w-10 h-10 rounded-xl bg-background-tertiary items-center justify-center mr-3">
                      <Ionicons
                        name={
                          collection.type === 'places'
                            ? 'location'
                            : collection.type === 'songs'
                            ? 'musical-notes'
                            : collection.type === 'photos'
                            ? 'images'
                            : 'link'
                        }
                        size={20}
                        color="#8B6F5A"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-text-primary text-sm font-medium">{collection.name}</Text>
                      <Text className="text-text-tertiary text-xs mt-0.5">
                        {collection.items.length} item{collection.items.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#A8937F" />
                  </View>
                </Pressable>
              ))}

              {collections.length === 0 && !isCreating && (
                <View className="items-center py-8">
                  <Ionicons name="folder-open-outline" size={32} color="#A8937F" />
                  <Text className="text-text-tertiary text-sm mt-2">No collections yet</Text>
                  <Pressable
                    onPress={() => setIsCreating(true)}
                    className="mt-3"
                  >
                    <Text className="text-accent-primary text-sm font-medium">Create your first collection</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>

            {/* Bottom padding */}
            <View className="h-8" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
