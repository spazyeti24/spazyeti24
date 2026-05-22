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
  Modal,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useHousehold } from '../../src/contexts/HouseholdContext';

export default function SignupScreen(): JSX.Element {
  const { signUp } = useAuth();
  const { createHousehold } = useHousehold();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Household creation modal
  const [showHouseholdModal, setShowHouseholdModal] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [isCreatingHousehold, setIsCreatingHousehold] = useState(false);

  const validateForm = (): boolean => {
    if (!fullName.trim()) { setError('Please enter your full name.'); return false; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.'); return false;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return false; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return false; }
    return true;
  };

  const handleSignUp = async () => {
    setError(null);
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim());
      setShowHouseholdModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) return;
    setIsCreatingHousehold(true);
    try {
      await createHousehold(householdName.trim());
      setShowHouseholdModal(false);
      router.replace('/(app)/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create household.';
      setError(msg);
      setShowHouseholdModal(false);
    } finally {
      setIsCreatingHousehold(false);
    }
  };

  const inputTheme = {
    colors: { onSurfaceVariant: '#94A3B8', surface: '#1E3A5F' },
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start organizing with StashTag</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              textContentType="name"
              style={styles.input}
              mode="outlined"
              outlineColor="#334155"
              activeOutlineColor="#F5A623"
              textColor="#FFFFFF"
              theme={inputTheme}
              left={<TextInput.Icon icon="account-outline" color="#94A3B8" />}
            />

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
              theme={inputTheme}
              left={<TextInput.Icon icon="email-outline" color="#94A3B8" />}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              textContentType="newPassword"
              style={styles.input}
              mode="outlined"
              outlineColor="#334155"
              activeOutlineColor="#F5A623"
              textColor="#FFFFFF"
              theme={inputTheme}
              left={<TextInput.Icon icon="lock-outline" color="#94A3B8" />}
              right={
                <TextInput.Icon
                  icon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                  color="#94A3B8"
                  onPress={() => setPasswordVisible((v) => !v)}
                />
              }
            />

            <TextInput
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!passwordVisible}
              textContentType="newPassword"
              style={styles.input}
              mode="outlined"
              outlineColor="#334155"
              activeOutlineColor="#F5A623"
              textColor="#FFFFFF"
              theme={inputTheme}
              left={<TextInput.Icon icon="lock-check-outline" color="#94A3B8" />}
            />

            {error ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              mode="contained"
              onPress={handleSignUp}
              loading={isLoading}
              disabled={isLoading}
              style={styles.signupButton}
              contentStyle={styles.signupButtonContent}
              labelStyle={styles.signupButtonLabel}
              buttonColor="#F5A623"
              textColor="#0F1F3D"
            >
              Create Account
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* First Household Modal */}
      <Modal visible={showHouseholdModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalIcon}>
              <MaterialCommunityIcons name="home-heart" size={40} color="#F5A623" />
            </View>
            <Text style={styles.modalTitle}>Name your household</Text>
            <Text style={styles.modalSubtitle}>
              Give your household a name, like "Smith Family" or "My Apartment". You can add more later.
            </Text>
            <TextInput
              label="Household name"
              value={householdName}
              onChangeText={setHouseholdName}
              autoFocus
              style={styles.modalInput}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#0F1F3D"
              textColor="#0F1F3D"
            />
            <Button
              mode="contained"
              onPress={handleCreateHousehold}
              loading={isCreatingHousehold}
              disabled={isCreatingHousehold || !householdName.trim()}
              style={styles.modalButton}
              buttonColor="#0F1F3D"
              textColor="#FFFFFF"
              contentStyle={{ paddingVertical: 4 }}
            >
              Let's Go!
            </Button>
          </View>
        </View>
      </Modal>
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
  header: { marginBottom: 32 },
  title: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  subtitle: { fontSize: 16, color: '#94A3B8' },
  form: { gap: 16 },
  input: { backgroundColor: '#1E3A5F' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  errorText: { color: '#EF4444', fontSize: 13, flex: 1 },
  signupButton: { marginTop: 8, borderRadius: 12 },
  signupButtonContent: { paddingVertical: 6 },
  signupButtonLabel: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: { color: '#94A3B8', fontSize: 15 },
  footerLink: { color: '#F5A623', fontSize: 15, fontWeight: '700' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 48,
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F1F3D',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalInput: { marginBottom: 16, backgroundColor: '#FFFFFF' },
  modalButton: { borderRadius: 12 },
});
