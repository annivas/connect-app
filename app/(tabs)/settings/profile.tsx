import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActionSheetIOS, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '../../../src/components/ui/Avatar';
import { IconButton } from '../../../src/components/ui/IconButton';
import { StatusPicker } from '../../../src/components/ui/StatusPicker';
import { RichStatusBadge } from '../../../src/components/ui/RichStatusBadge';
import { useUserStore } from '../../../src/stores/useUserStore';
import { useToastStore } from '../../../src/stores/useToastStore';
import type { User, RichStatus } from '../../../src/types';

function InfoRow({
  icon,
  label,
  value,
  editing,
  editValue,
  onChangeText,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  editing?: boolean;
  editValue?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
}) {
  return (
    <View className="flex-row items-center py-3.5 px-4">
      <View className="w-9 h-9 bg-surface-elevated rounded-full items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color="#7A6355" />
      </View>
      <View className="flex-1">
        <Text className="text-text-tertiary text-xs">{label}</Text>
        {editing ? (
          onPress ? (
            <Pressable onPress={onPress} className="mt-1">
              <View className="flex-row items-center bg-surface-elevated rounded-lg px-3 py-1.5">
                <Text className="text-text-primary text-[15px] flex-1">
                  {editValue || value}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#A8937F" />
              </View>
            </Pressable>
          ) : (
            <TextInput
              value={editValue}
              onChangeText={onChangeText}
              className="text-text-primary text-[15px] mt-1 bg-surface-elevated rounded-lg px-3 py-1.5"
              placeholderTextColor="#A8937F"
            />
          )
        ) : (
          <Text className="text-text-primary text-[15px] mt-0.5">{value}</Text>
        )}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const currentUser = useUserStore((s) => s.currentUser)!;

  const [isEditing, setIsEditing] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<User['status']>('online');

  const canSave = editName.trim().length > 0;

  const handleEdit = () => {
    setEditName(currentUser.name);
    setEditEmail(currentUser.email ?? '');
    setEditPhone(currentUser.phone ?? '');
    setEditStatus(currentUser.status);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!canSave) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useUserStore.getState().updateCurrentUser({
      name: editName.trim(),
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || undefined,
      status: editStatus,
    });
    setIsEditing(false);
  };

  const handleStatusPick = () => {
    const options: User['status'][] = ['online', 'away', 'offline'];
    const labels = ['Online', 'Away', 'Offline', 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: labels, cancelButtonIndex: 3 },
        (idx) => {
          if (idx < 3) {
            Haptics.selectionAsync();
            setEditStatus(options[idx]);
          }
        }
      );
    } else {
      Alert.alert('Status', undefined, [
        ...options.map((opt) => ({
          text: opt.charAt(0).toUpperCase() + opt.slice(1),
          onPress: () => {
            Haptics.selectionAsync();
            setEditStatus(opt);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const handleAvatarPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const hasPhoto = !!currentUser.avatar;

    const pickPhoto = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        useToastStore.getState().show({ message: 'Please allow photo library access in Settings.', type: 'warning' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled || !result.assets?.[0]) return;
      useUserStore.getState().updateCurrentUser({ avatar: result.assets[0].uri });
      useToastStore.getState().show({ message: 'Profile photo updated.', type: 'success' });
    };

    const removePhoto = () => {
      useUserStore.getState().updateCurrentUser({ avatar: undefined });
      useToastStore.getState().show({ message: 'Profile photo removed.', type: 'success' });
    };

    if (Platform.OS === 'ios') {
      const options = hasPhoto
        ? ['Choose from Library', 'Remove Photo', 'Cancel']
        : ['Choose from Library', 'Cancel'];
      const destructiveIdx = hasPhoto ? 1 : undefined;
      const cancelIdx = hasPhoto ? 2 : 1;

      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIdx, destructiveButtonIndex: destructiveIdx },
        (idx) => {
          if (idx === 0) pickPhoto();
          else if (hasPhoto && idx === 1) removePhoto();
        }
      );
    } else {
      const buttons: Alert['alert'] extends (...args: infer A) => void ? never : any[] = [
        { text: 'Choose from Library', onPress: pickPhoto },
        ...(hasPhoto ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: removePhoto }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ];
      Alert.alert('Profile Photo', undefined, buttons);
    }
  };

  const statusLabel = (s: User['status']) =>
    s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-primary">
      {/* Header */}
      {isEditing ? (
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-border-subtle">
          <Pressable onPress={handleCancel} hitSlop={8}>
            <Text className="text-accent-primary text-[16px]">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary text-[17px] font-semibold">
            Edit Profile
          </Text>
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8}>
            <Text
              className={`text-[16px] font-semibold ${
                canSave ? 'text-accent-primary' : 'text-text-tertiary'
              }`}
            >
              Save
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-center px-2 pb-2 border-b border-border-subtle">
          <IconButton icon="chevron-back" onPress={() => router.back()} />
          <Text className="text-text-primary text-[17px] font-semibold ml-1 flex-1">
            Profile
          </Text>
          <IconButton icon="create-outline" onPress={handleEdit} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & Name */}
        <View className="items-center pt-8 pb-6">
          <Pressable onPress={handleAvatarPress} className="active:opacity-80">
            <View>
              <Avatar
                uri={currentUser.avatar}
                name={currentUser.name}
                size="xl"
                status={isEditing ? editStatus : currentUser.status}
                showStatus
                statusEmoji={!isEditing ? currentUser.richStatus?.emoji : undefined}
              />
              {/* Camera badge */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: '#D4764E',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: '#FFF8F0',
                }}
              >
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>
          {isEditing ? (
            <TextInput
              value={editName}
              onChangeText={setEditName}
              className="text-text-primary text-2xl font-bold mt-4 text-center bg-surface-elevated rounded-xl px-6 py-2"
              placeholderTextColor="#A8937F"
              placeholder="Your name"
            />
          ) : (
            <Text className="text-text-primary text-2xl font-bold mt-4">
              {currentUser.name}
            </Text>
          )}
          <Text className="text-text-secondary text-sm mt-1">
            {currentUser.username}
          </Text>
          {!isEditing && currentUser.richStatus ? (
            <Pressable
              onPress={() => setShowStatusPicker(true)}
              className="mt-2 active:opacity-80"
            >
              <RichStatusBadge richStatus={currentUser.richStatus} size="md" />
            </Pressable>
          ) : !isEditing && currentUser.statusMessage ? (
            <View className="flex-row items-center mt-2 bg-surface px-4 py-2 rounded-full">
              <Text className="text-text-tertiary text-sm">
                {currentUser.statusMessage}
              </Text>
            </View>
          ) : null}

          {/* Set/Change Status Button */}
          {!isEditing && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowStatusPicker(true);
              }}
              className="mt-2 active:opacity-80"
            >
              <View className="flex-row items-center bg-accent-primary/10 rounded-full px-4 py-2">
                <Ionicons name="happy-outline" size={16} color="#D4764E" />
                <Text className="text-accent-primary text-sm font-medium ml-1.5">
                  {currentUser.richStatus ? 'Update status' : 'Set a status'}
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Info */}
        <View className="bg-surface mx-4 rounded-2xl overflow-hidden">
          <InfoRow
            icon="at-outline"
            label="Username"
            value={currentUser.username}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={currentUser.email ?? 'Not set'}
            editing={isEditing}
            editValue={editEmail}
            onChangeText={setEditEmail}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={currentUser.phone ?? 'Not set'}
            editing={isEditing}
            editValue={editPhone}
            onChangeText={setEditPhone}
          />
          <View className="h-px bg-border-subtle mx-4" />
          <InfoRow
            icon="ellipse"
            label="Status"
            value={statusLabel(currentUser.status)}
            editing={isEditing}
            editValue={statusLabel(editStatus)}
            onPress={isEditing ? handleStatusPick : undefined}
          />
        </View>
      </ScrollView>

      {/* Status Picker */}
      <StatusPicker
        visible={showStatusPicker}
        currentStatus={currentUser.richStatus}
        onSave={(status: RichStatus) => {
          useUserStore.getState().updateCurrentUser({ richStatus: status });
        }}
        onClear={() => {
          useUserStore.getState().updateCurrentUser({ richStatus: undefined });
        }}
        onClose={() => setShowStatusPicker(false)}
      />
    </SafeAreaView>
  );
}
