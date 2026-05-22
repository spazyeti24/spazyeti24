import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase } from '../../../src/lib/supabase';

export default function AccountScreen(): JSX.Element {
  const { user, profile, signOut, updateProfile } = useAuth();

  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [upgradeModal, setUpgradeModal] = useState(false);

  const getInitials = (): string => {
    const name = profile?.full_name ?? user?.email ?? '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) return;
    setIsSavingProfile(true);
    try {
      await updateProfile({ full_name: fullName.trim() });
      setEditingProfile(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setChangePasswordModal(false);
      setNewPassword('');
      setConfirmNewPassword('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (err) {
            Alert.alert('Error', 'Failed to log out.');
          }
        },
      },
    ]);
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>

          {editingProfile ? (
            <View style={styles.editNameContainer}>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                mode="outlined"
                outlineColor="#E5E7EB"
                activeOutlineColor="#0F1F3D"
                style={styles.editNameInput}
                autoFocus
                label="Full name"
              />
              <View style={styles.editNameActions}>
                <Button
                  mode="contained"
                  onPress={handleSaveProfile}
                  loading={isSavingProfile}
                  disabled={isSavingProfile}
                  compact
                  buttonColor="#0F1F3D"
                  style={styles.saveBtn}
                >
                  Save
                </Button>
                <Button
                  mode="text"
                  onPress={() => { setEditingProfile(false); setFullName(profile?.full_name ?? ''); }}
                  compact
                  textColor="#6B7280"
                >
                  Cancel
                </Button>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.full_name || 'No name set'}</Text>
                <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
              </View>
              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => { setFullName(profile?.full_name ?? ''); setEditingProfile(true); }}
              >
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#F5A623" />
                <Text style={styles.editProfileBtnText}>Edit</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Subscription */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.subscriptionInfo}>
              <MaterialCommunityIcons
                name={profile?.is_pro ? 'crown' : 'crown-outline'}
                size={20}
                color={profile?.is_pro ? '#F5A623' : '#9CA3AF'}
              />
              <View>
                <Text style={styles.cardTitle}>
                  {profile?.is_pro ? 'StashTag Pro' : 'Free Plan'}
                </Text>
                {!profile?.is_pro && (
                  <Text style={styles.subscriptionSubtext}>Upgrade to remove ads & unlock features</Text>
                )}
              </View>
            </View>
            {!profile?.is_pro && (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => setUpgradeModal(true)}
              >
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Security */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Security</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setChangePasswordModal(true)}
          >
            <MaterialCommunityIcons name="lock-reset" size={20} color="#0F1F3D" />
            <Text style={styles.menuItemText}>Change Password</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Log out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>StashTag v{appVersion}</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={changePasswordModal} transparent animationType="slide" onRequestClose={() => setChangePasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#0F1F3D"
              style={styles.modalInput}
              autoFocus
            />
            <TextInput
              label="Confirm new password"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#0F1F3D"
              style={styles.modalInput}
            />
            {passwordError && (
              <Text style={styles.errorText}>{passwordError}</Text>
            )}
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => { setChangePasswordModal(false); setNewPassword(''); setConfirmNewPassword(''); setPasswordError(null); }}
                textColor="#6B7280"
                style={styles.modalCancelBtn}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleChangePassword}
                loading={isChangingPassword}
                buttonColor="#0F1F3D"
                style={styles.modalConfirmBtn}
              >
                Update
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upgrade Modal */}
      <Modal visible={upgradeModal} transparent animationType="slide" onRequestClose={() => setUpgradeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.upgradeIcon}>
              <MaterialCommunityIcons name="crown" size={40} color="#F5A623" />
            </View>
            <Text style={styles.modalTitle}>StashTag Pro</Text>
            <Text style={styles.upgradeDesc}>
              Remove ads, unlock unlimited households, advanced search filters, and priority support.
            </Text>
            <View style={styles.upgradeFeatures}>
              {['No ads', 'Unlimited households', 'Priority support', 'Export to CSV'].map((f) => (
                <View key={f} style={styles.upgradeFeatureRow}>
                  <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.upgradeFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
            <Button
              mode="contained"
              onPress={() => {
                setUpgradeModal(false);
                Alert.alert('Coming Soon', 'Pro subscriptions are coming soon!');
              }}
              buttonColor="#F5A623"
              textColor="#0F1F3D"
              style={styles.upgradeConfirmBtn}
              contentStyle={{ paddingVertical: 4 }}
              labelStyle={{ fontSize: 16, fontWeight: '700' }}
            >
              Upgrade to Pro — $2.99/mo
            </Button>
            <Button mode="text" onPress={() => setUpgradeModal(false)} textColor="#9CA3AF">
              Maybe Later
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#0F1F3D',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F1F3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F1F3D',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  editProfileBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5A623',
  },
  editNameContainer: { flex: 1 },
  editNameInput: { backgroundColor: '#FFFFFF', marginBottom: 8 },
  editNameActions: { flexDirection: 'row', gap: 8 },
  saveBtn: { borderRadius: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1F3D',
    marginBottom: 4,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  subscriptionSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  upgradeBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  upgradeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F1F3D',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
    marginTop: 8,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#0F1F3D',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
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
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F1F3D',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  modalCancelBtn: { borderRadius: 10, borderColor: '#E5E7EB' },
  modalConfirmBtn: { borderRadius: 10 },
  // Upgrade
  upgradeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  upgradeDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  upgradeFeatures: { marginBottom: 24, gap: 10 },
  upgradeFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upgradeFeatureText: {
    fontSize: 15,
    color: '#0F1F3D',
    fontWeight: '500',
  },
  upgradeConfirmBtn: { borderRadius: 14, marginBottom: 12 },
});
