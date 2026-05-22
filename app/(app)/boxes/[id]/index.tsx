import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TagChip } from '../../../../src/components/ui/TagChip';
import { useHousehold } from '../../../../src/contexts/HouseholdContext';
import { supabase } from '../../../../src/lib/supabase';
import { getBoxes } from '../../../../src/lib/storage';
import { useNetworkStatus } from '../../../../src/hooks/useNetworkStatus';
import { Box } from '../../../../src/types';
import Toast from 'react-native-toast-message';

export default function BoxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userRole, currentHousehold } = useHousehold();
  const { isOnline } = useNetworkStatus();
  const [box, setBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(true);

  const canEdit = userRole === 'head' || userRole === 'editor';

  const fetchBox = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (isOnline) {
        const { data, error } = await supabase.from('boxes').select('*').eq('id', id).single();
        if (error) throw error;
        setBox(data as Box);
      } else if (currentHousehold) {
        const cached = await getBoxes(currentHousehold.id);
        const found = cached?.find((b) => b.id === id) ?? null;
        setBox(found);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load box details.' });
    } finally {
      setLoading(false);
    }
  }, [id, isOnline, currentHousehold]);

  useEffect(() => { fetchBox(); }, [fetchBox]);

  async function handleDelete() {
    Alert.alert('Delete Box', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.from('boxes').delete().eq('id', id);
            if (error) throw error;
            Toast.show({ type: 'success', text1: 'Box Deleted' });
            router.back();
          } catch {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Could not delete box.' });
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5A623" />
        </View>
      </SafeAreaView>
    );
  }

  if (!box) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F1F3D" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="package-variant" size={48} color="#D1D5DB" />
          <Text style={styles.notFoundText}>Box not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F1F3D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{box.name}</Text>
        {canEdit ? (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(app)/boxes/create', params: { boxId: box.id } })}
            style={styles.editBtn}
          >
            <MaterialCommunityIcons name="pencil-outline" size={22} color="#0F1F3D" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView>
        {/* Photo */}
        {box.photo_url ? (
          <Image source={{ uri: box.photo_url }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <MaterialCommunityIcons name="package-variant-closed" size={56} color="#D1D5DB" />
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.name}>{box.name}</Text>

          {box.location ? (
            <View style={styles.row}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#F5A623" />
              <Text style={styles.location}>{box.location}</Text>
            </View>
          ) : null}

          {box.description ? (
            <Text style={styles.description}>{box.description}</Text>
          ) : null}

          {box.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionLabel}>Tags</Text>
              <View style={styles.tagRow}>
                {box.tags.map((t) => <TagChip key={t} label={t} />)}
              </View>
            </View>
          )}

          {/* QR Code */}
          <View style={styles.qrSection}>
            <Text style={styles.sectionLabel}>QR Code</Text>
            <TouchableOpacity
              style={styles.qrContainer}
              onPress={() => router.push(`/(app)/boxes/${box.id}/qr`)}
              activeOpacity={0.8}
            >
              {box.qr_code ? (
                <QRCode value={box.qr_code} size={100} color="#0F1F3D" backgroundColor="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="qrcode" size={60} color="#D1D5DB" />
              )}
              <Text style={styles.qrHint}>Tap to manage QR code</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push(`/(app)/boxes/${box.id}/qr`)}
            >
              <MaterialCommunityIcons name="printer-outline" size={20} color="#0F1F3D" />
              <Text style={styles.actionBtnText}>Print / Share QR</Text>
            </TouchableOpacity>

            {canEdit && (
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete Box</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#E5E7EB',
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#0F1F3D', textAlign: 'center' },
  editBtn: { padding: 4, width: 40, alignItems: 'flex-end' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: '#9CA3AF', marginTop: 12, fontSize: 15 },
  photo: { width: '100%', height: 240 },
  photoPlaceholder: {
    height: 200, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: 20 },
  name: { fontSize: 24, fontWeight: '800', color: '#0F1F3D', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  location: { fontSize: 15, color: '#6B7280', flex: 1 },
  description: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 16 },
  tagsSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: -3 },
  qrSection: { marginBottom: 24 },
  qrContainer: {
    alignSelf: 'flex-start', padding: 16, backgroundColor: '#F9FAFB',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', gap: 8,
  },
  qrHint: { fontSize: 12, color: '#9CA3AF' },
  actions: { gap: 10, marginTop: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#0F1F3D' },
  deleteBtn: { borderColor: '#FEE2E2', backgroundColor: '#FFF5F5' },
  deleteBtnText: { color: '#EF4444' },
});
