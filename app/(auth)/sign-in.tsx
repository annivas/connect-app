import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthInput } from '../../src/components/auth/AuthInput';
import { AuthButton } from '../../src/components/auth/AuthButton';
import { useAuthStore } from '../../src/stores/useAuthStore';

export default function SignInScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  function validate(): boolean {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSignIn() {
    if (!validate()) return;

    const { error } = await signIn(email.trim(), password);
    if (error) {
      setErrors({ form: error });
    }
    // On success, onAuthStateChange in useAuthStore sets the session,
    // which triggers the auth gate in _layout.tsx to show (tabs)
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
          {/* Logo & Title */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 bg-accent-primary/20 rounded-2xl items-center justify-center mb-4">
              <Ionicons name="chatbubbles" size={32} color="#D4764E" />
            </View>
            <Text className="text-text-primary text-2xl font-bold">Welcome back</Text>
            <Text className="text-text-tertiary text-sm mt-1">Sign in to your account</Text>
          </View>

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

          <AuthInput
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Forgot Password */}
          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            className="self-end mb-6"
          >
            <Text className="text-accent-primary text-sm font-medium">Forgot password?</Text>
          </Pressable>

          {/* Sign In Button */}
          <AuthButton title="Sign In" onPress={handleSignIn} isLoading={isLoading} />

          {/* Sign Up Link */}
          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-text-tertiary text-sm">Don&apos;t have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/sign-up')}>
              <Text className="text-accent-primary text-sm font-semibold">Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
