import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { TextInput, Button, Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';

export default function LoginScreen(): JSX.Element {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!email.trim()) { setError('Please enter your email address.'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.'); return false;
    }
    if (!password) { setError('Please enter your password.'); return false; }
    return true;
  };

  const handleLogin = async () => {
    setError(null);
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      // Navigation happens automatically via auth state change → index redirect
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert(
        'Enter Email',
        'Please enter your email address above, then tap "Forgot Password" again.',
      );
      return;
    }
    Alert.alert(
      'Reset Password',
      `Send a password reset email to ${email.trim()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: async () => {
            try {
              const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
                email.trim().toLowerCase()
              );
              if (resetErr) throw resetErr;
              setSuccessMsg('Password reset email sent! Check your inbox.');
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed to send reset email.';
              setError(msg);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#CBD5E1" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to your StashTag account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              style={styles.input}
              mode="outlined"
              outlineColor="#334155"
              activeOutlineColor="#F5A623"
              textColor="#FFFFFF"
              theme={{
                colors: {
                  onSurfaceVariant: '#94A3B8',
                  surface: '#1E3A5F',
                },
              }}
              left={<TextInput.Icon icon="email-outline" color="#94A3B8" />}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              autoComplete="password"
              textContentType="password"
              style={styles.input}
              mode="outlined"
              outlineColor="#334155"
              activeOutlineColor="#F5A623"
              textColor="#FFFFFF"
              theme={{
                colors: {
                  onSurfaceVariant: '#94A3B8',
                  surface: '#1E3A5F',
                },
              }}
              left={<TextInput.Icon icon="lock-outline" color="#94A3B8" />}
              right={
                <TextInput.Icon
                  icon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                  color="#94A3B8"
                  onPress={() => setPasswordVisible((v) => !v)}
                />
              }
            />

            {error ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.forgotLink} onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
              labelStyle={styles.loginButtonLabel}
              buttonColor="#F5A623"
              textColor="#0F1F3D"
            >
              Log In
            </Button>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!successMsg}
        onDismiss={() => setSuccessMsg(null)}
        duration={4000}
        style={styles.snackbar}
      >
        {successMsg ?? ''}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1F3D' },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 24,
  },
  header: {
    marginBottom: 36,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  form: {
    gap: 16,
    flex: 1,
  },
  input: {
    backgroundColor: '#1E3A5F',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  forgotLink: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: '#F5A623',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  loginButtonContent: {
    paddingVertical: 6,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 15,
  },
  footerLink: {
    color: '#F5A623',
    fontSize: 15,
    fontWeight: '700',
  },
  snackbar: {
    backgroundColor: '#10B981',
  },
});
