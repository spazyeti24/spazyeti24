import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StashTagHeader } from '../../../src/components/ui/StashTagHeader';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useHousehold } from '../../../src/contexts/HouseholdContext';
import { HouseholdMember, UserRole } from '../../../src/types';

const ROLE_LABELS: Record<UserRole, string> = {
  head: 'Head',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<UserRole, string> = {
  head: '#0F1F3D',
  editor: '#059669',
  viewer: '#6B7280',
};

function RoleBadge({ role }: { role: UserRole }): JSX.Element {
  return (
    <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[role] }]}>
      <Text style={styles.roleBadgeText}>{ROLE_LABELS[role]}</Text>
    </View>
  );
}

export default function HouseholdScreen(): JSX.Element {
  const { user } = useAuth();
  const {
    households,
    currentHousehold,
    members,
    userRole,
    isLoading,
    createHousehold,
    updateHousehold,
    inviteMember,
    removeMember,
    refreshHouseholds,
  } = useHousehold();

  const [editingName, setEditingName] = useState(false);
  const [householdName, setHouseholdName] = useState(currentHousehold?.name ?? '');
  const [isSavingName, setIsSavingName] = useState(false);

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [newHouseholdModalVisible, setNewHouseholdModalVisible] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const isHead = userRole === 'head';

  const handleSaveName = async () => {
    if (!householdName.trim() || !currentHousehold) return;
    setIsSavingName(true);
    try {
      await updateHousehold(currentHousehold.id, { name: householdName.trim() });
      setEditingName(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to update household name.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleInvite = async () => {
    setInviteError(null);
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteError('Please enter a valid email address.');
      return;
    }
    setIsInviting(true);
    try {
      await inviteMember(inviteEmail.trim().toLowerCase(), inviteRole);
      setInviteModalVisible(false);
      setInviteEmail('');
      setInviteRole('editor');
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite member.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = (member: HouseholdMember) => {
    const name = member.profile?.full_name ?? member.invited_email ?? 'this member';
    Alert.alert('Remove Member', `Remove ${name} from this household?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeMember(member.id);
        },
      },
    ]);
  };

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim()) return;
    setIsCreating(true);
    try {
      await createHousehold(newHouseholdName.trim());
      setNewHouseholdModalVisible(false);
      setNewHouseholdName('');
    } catch (err) {
      Alert.alert('Error', 'Failed to create household.');
    } finally {
      setIsCreating(false);
    }
  };

  const activeMembers = members.filter((m) => m.status === 'active');
  const pendingMembers = members.filter((m) => m.status === 'pending');

  return (
    <SafeAreaView style={styles.safe}>
      <StashTagHeader />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Household name */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Household</Text>
            {isHead && !editingName && (
              <TouchableOpacity
                onPress={() => { setHouseholdName(currentHousehold?.name ?? ''); setEditingName(true); }}
              >
                <MaterialCommunityIcons name="pencil-outline" size={20} color="#F5A623" />
              </TouchableOpacity>
            )}
          </View>

          {editingName ? (
            <View style={styles.editNameRow}>
              <TextInput
                value={householdName}
                onChangeText={setHouseholdName}
                mode="outlined"
                outlineColor="#E5E7EB"
                activeOutlineColor="#0F1F3D"
                style={styles.editNameInput}
                autoFocus
              />
              <Button
                mode="contained"
                onPress={handleSaveName}
                loading={isSavingName}
                compact
                buttonColor="#0F1F3D"
                style={styles.editNameSave}
              >
                Save
              </Button>
              <Button
                mode="text"
                onPress={() => setEditingName(false)}
                compact
                textColor="#6B7280"
              >
                Cancel
              </Button>
            </View>
          ) : (
            <Text style={styles.householdName}>{currentHousehold?.name ?? '—'}</Text>
          )}

          <View style={styles.roleInfo}>
            <Text style={styles.roleInfoLabel}>Your role:</Text>
            {userRole && <RoleBadge role={userRole} />}
          </View>
        </View>

        {/* Members */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Members ({activeMembers.length})</Text>
            {isHead && (
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => setInviteModalVisible(true)}
              >
                <MaterialCommunityIcons name="account-plus-outline" size={16} color="#0F1F3D" />
                <Text style={styles.inviteButtonText}>Invite</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator color="#F5A623" style={styles.loading} />
          ) : (
            activeMembers.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const memberRole = member.role as UserRole;
              return (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(member.profile?.full_name ?? member.invited_email ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.profile?.full_name ?? member.invited_email ?? 'Unknown'}
                      {isCurrentUser && <Text style={styles.youBadge}> (you)</Text>}
                    </Text>
                    <RoleBadge role={memberRole} />
                  </View>
                  {isHead && !isCurrentUser && (
                    <TouchableOpacity onPress={() => handleRemoveMember(member)}>
                      <MaterialCommunityIcons name="account-remove-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Pending invites */}
        {pendingMembers.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pending Invites ({pendingMembers.length})</Text>
            {pendingMembers.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <View style={[styles.memberAvatar, styles.pendingAvatar]}>
                  <MaterialCommunityIcons name="email-outline" size={18} color="#6B7280" />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.invited_email ?? 'Unknown'}</Text>
                  <Text style={styles.pendingLabel}>Invitation pending</Text>
                </View>
                {isHead && (
                  <TouchableOpacity onPress={() => handleRemoveMember(member)}>
                    <MaterialCommunityIcons name="close-circle-outline" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Create new household */}
        <TouchableOpacity
          style={styles.createHouseholdBtn}
          onPress={() => setNewHouseholdModalVisible(true)}
        >
          <MaterialCommunityIcons name="home-plus-outline" size={20} color="#0F1F3D" />
          <Text style={styles.createHouseholdText}>Create New Household</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={inviteModalVisible} transparent animationType="slide" onRequestClose={() => setInviteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Invite a Member</Text>

            <TextInput
              label="Email address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#0F1F3D"
              style={styles.modalInput}
              autoFocus
            />

            <Text style={styles.roleLabel}>Role</Text>
            <View style={styles.roleChips}>
              {(['head', 'editor', 'viewer'] as UserRole[]).map((r) => (
                <TouchableOpacity key={r} onPress={() => setInviteRole(r)}>
                  <Chip
                    selected={inviteRole === r}
                    style={[styles.roleChip, inviteRole === r && styles.roleChipSelected]}
                    textStyle={[styles.roleChipText, inviteRole === r && styles.roleChipTextSelected]}
                    onPress={() => setInviteRole(r)}
                  >
                    {ROLE_LABELS[r]}
                  </Chip>
                </TouchableOpacity>
              ))}
            </View>

            {inviteError && (
              <Text style={styles.inviteError}>{inviteError}</Text>
            )}

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => { setInviteModalVisible(false); setInviteEmail(''); setInviteError(null); }}
                textColor="#6B7280"
                style={styles.modalCancelBtn}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleInvite}
                loading={isInviting}
                disabled={isInviting}
                buttonColor="#0F1F3D"
                style={styles.modalConfirmBtn}
              >
                Send Invite
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Household Modal */}
      <Modal visible={newHouseholdModalVisible} transparent animationType="slide" onRequestClose={() => setNewHouseholdModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Household</Text>
            <TextInput
              label="Household name"
              value={newHouseholdName}
              onChangeText={setNewHouseholdName}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#0F1F3D"
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => { setNewHouseholdModalVisible(false); setNewHouseholdName(''); }}
                textColor="#6B7280"
                style={styles.modalCancelBtn}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateHousehold}
                loading={isCreating}
                disabled={isCreating || !newHouseholdName.trim()}
                buttonColor="#0F1F3D"
                style={styles.modalConfirmBtn}
              >
                Create
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1F3D',
  },
  householdName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F1F3D',
    marginBottom: 12,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  editNameInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    height: 44,
  },
  editNameSave: { borderRadius: 8 },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleInfoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8EF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F1F3D',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F1F3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAvatar: {
    backgroundColor: '#E5E7EB',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memberInfo: { flex: 1, gap: 4 },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F1F3D',
  },
  youBadge: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  pendingLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  loading: { paddingVertical: 20 },
  createHouseholdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: 10,
  },
  createHouseholdText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F1F3D',
  },
  // Modal styles
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
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F1F3D',
    marginBottom: 8,
  },
  roleChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleChip: {
    backgroundColor: '#F3F4F6',
  },
  roleChipSelected: {
    backgroundColor: '#0F1F3D',
  },
  roleChipText: {
    color: '#374151',
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
  },
  inviteError: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    borderRadius: 10,
    borderColor: '#E5E7EB',
  },
  modalConfirmBtn: {
    borderRadius: 10,
  },
});
