import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthInput } from '../../src/components/auth/AuthInput';
import { AuthButton } from '../../src/components/auth/AuthButton';
import { useAuthStore } from '../../src/stores/useAuthStore';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string; form?: string }>({});
  const [isSuccess, setIsSuccess] = useState(false);

  function validate(): boolean {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleReset() {
    if (!validate()) return;

    const { error } = await resetPassword(email.trim());
    if (error) {
      setErrors({ form: error });
    } else {
      setIsSuccess(true);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 bg-accent-primary/20 rounded-2xl items-center justify-center mb-4">
              <Ionicons name="key-outline" size={28} color="#D4764E" />
            </View>
            <Text className="text-text-primary text-2xl font-bold">Reset password</Text>
            <Text className="text-text-tertiary text-sm mt-1 text-center px-4">
              Enter your email and we&apos;ll send you a link to reset your password
            </Text>
          </View>

          {isSuccess ? (
            /* Success State */
            <View className="bg-status-success/10 border border-status-success/30 rounded-xl px-4 py-5 mb-6">
              <View className="items-center">
                <Ionicons name="checkmark-circle" size={32} color="#2D9F6F" />
                <Text className="text-status-success text-base font-semibold mt-2">
                  Check your email
                </Text>
                <Text className="text-text-secondary text-sm text-center mt-1">
                  We sent a password reset link to {email}
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Form Error */}
              {errors.form && (
                <View className="bg-status-error/10 border border-status-error/30 rounded-xl px-4 py-3 mb-4">
                  <Text className="text-status-error text-sm text-center">{errors.form}</Text>
                </View>
              )}

              {/* Form */}
              <AuthInput
                label="Email"
                icon="mail-outline"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View className="mt-2">
                <AuthButton
                  title="Send Reset Link"
                  onPress={handleReset}
                  isLoading={isLoading}
                />
              </View>
            </>
          )}

          {/* Back to Sign In */}
          <Pressable onPress={() => router.back()} className="flex-row items-center justify-center mt-6">
            <Ionicons name="arrow-back" size={16} color="#D4764E" />
            <Text className="text-accent-primary text-sm font-semibold ml-1">
              Back to Sign In
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
