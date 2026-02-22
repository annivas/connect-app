import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthInput } from '../../src/components/auth/AuthInput';
import { AuthButton } from '../../src/components/auth/AuthButton';
import { useAuthStore } from '../../src/stores/useAuthStore';

interface FormErrors {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

export default function SignUpScreen() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      newErrors.username = 'Only letters, numbers, and underscores';
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSignUp() {
    if (!validate()) return;

    const { error } = await signUp(email.trim(), password, name.trim(), username.trim());
    if (error) {
      setErrors({ form: error });
    }
    // On success, onAuthStateChange sets session → auth gate shows (tabs)
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
              <Ionicons name="person-add" size={28} color="#D4764E" />
            </View>
            <Text className="text-text-primary text-2xl font-bold">Create account</Text>
            <Text className="text-text-tertiary text-sm mt-1">
              Join Connect and start messaging
            </Text>
          </View>

          {/* Form Error */}
          {errors.form && (
            <View className="bg-status-error/10 border border-status-error/30 rounded-xl px-4 py-3 mb-4">
              <Text className="text-status-error text-sm text-center">{errors.form}</Text>
            </View>
          )}

          {/* Form */}
          <AuthInput
            label="Full Name"
            icon="person-outline"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            error={errors.name}
            autoCapitalize="words"
          />

          <AuthInput
            label="Username"
            icon="at-outline"
            placeholder="johndoe"
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase())}
            error={errors.username}
            autoCapitalize="none"
            autoCorrect={false}
          />

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
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            autoCapitalize="none"
          />

          <AuthInput
            label="Confirm Password"
            icon="lock-closed-outline"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Sign Up Button */}
          <View className="mt-2">
            <AuthButton title="Create Account" onPress={handleSignUp} isLoading={isLoading} />
          </View>

          {/* Sign In Link */}
          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-text-tertiary text-sm">Already have an account? </Text>
            <Pressable onPress={() => router.back()}>
              <Text className="text-accent-primary text-sm font-semibold">Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
