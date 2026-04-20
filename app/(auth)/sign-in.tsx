import { useState } from 'react';
import {
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Sign in failed', error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}
      >
        <Text style={{ fontSize: 36, fontWeight: '700', textAlign: 'center' }}>Feyend</Text>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 8 }}>
          Find it. Reward it.
        </Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={inputStyle}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={inputStyle}
        />
        <Pressable
          onPress={signIn}
          disabled={loading}
          style={{ backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Sign In</Text>
          )}
        </Pressable>
        <Link href="/(auth)/sign-up" asChild>
          <Pressable style={{ alignItems: 'center', padding: 8 }}>
            <Text style={{ color: '#007AFF' }}>Don't have an account? Sign up</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 12,
  padding: 14,
  fontSize: 16,
  backgroundColor: '#F8F8F8',
} as const;
