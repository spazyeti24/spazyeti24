import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StashTagHeader } from '../../../src/components/ui/StashTagHeader';
import { OfflineBanner } from '../../../src/components/ui/OfflineBanner';
import { BoxCard } from '../../../src/components/ui/BoxCard';
import { AdBanner } from '../../../src/components/ui/AdBanner';
import { QRScanner } from '../../../src/components/QRScanner';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useHousehold } from '../../../src/contexts/HouseholdContext';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { supabase } from '../../../src/lib/supabase';
import { saveBoxes, getBoxes } from '../../../src/lib/storage';
import { Box } from '../../../src/types';

export default function HomeScreen(): JSX.Element {
  const { profile } = useAuth();
  const { currentHousehold } = useHousehold();
  const { isOnline } = useNetworkStatus();

  const [recentBoxes, setRecentBoxes] = useState<Box[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRecentBoxes = useCallback(async () => {
    if (!currentHousehold) return;
    setIsLoading(true);
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('boxes')
          .select('*')
          .eq('household_id', currentHousehold.id)
          .eq('is_archived', false)
          .order('updated_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        const boxes = (data ?? []) as Box[];
        setRecentBoxes(boxes);
        await saveBoxes(currentHousehold.id, boxes);
      } else {
        const cached = await getBoxes(currentHousehold.id);
        if (cached) {
          setRecentBoxes(cached.slice(0, 5));
        }
      }
    } catch (err) {
      console.error('[Home] fetchRecentBoxes:', err);
      const cached = await getBoxes(currentHousehold.id);
      if (cached) setRecentBoxes(cached.slice(0, 5));
    } finally {
      setIsLoading(false);
    }
  }, [currentHousehold, isOnline]);

  useEffect(() => {
    fetchRecentBoxes();
  }, [fetchRecentBoxes]);

  const handleScan = (value: string) => {
    setScannerVisible(false);
    // Find box by QR code value and navigate to it
    const box = recentBoxes.find((b) => b.qr_code === value || b.id === value);
    if (box) {
      router.push(`/(app)/boxes/${box.id}`);
    } else {
      // Try to find in Supabase
      supabase
        .from('boxes')
        .select('id')
        .eq('qr_code', value)
        .single()
        .then(({ data }) => {
          if (data) router.push(`/(app)/boxes/${data.id}`);
        });
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push({ pathname: '/(app)/search', params: { q: searchQuery.trim() } });
    } else {
      router.push('/(app)/search');
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.safe}>
      <StashTagHeader />
      <OfflineBanner />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchRecentBoxes}
            tintColor="#F5A623"
          />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Hi, {firstName}! 👋</Text>
          <Text style={styles.greetingSubtext}>What are you looking for?</Text>
        </View>

        {/* QR Scan CTA */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setScannerVisible(true)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={28} color="#0F1F3D" />
          <Text style={styles.scanButtonText}>Scan QR Code</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#0F1F3D" />
        </TouchableOpacity>

        {/* Search bar */}
        <TouchableOpacity style={styles.searchBar} onPress={handleSearch} activeOpacity={0.8}>
          <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
          <Text style={styles.searchPlaceholder}>Search for an item...</Text>
        </TouchableOpacity>

        {/* Recent Boxes */}
        {recentBoxes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Boxes</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/boxes')}>
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentBoxes}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.boxList}
              renderItem={({ item }) => (
                <View style={styles.boxCardWrapper}>
                  <BoxCard
                    box={item}
                    viewMode="grid"
                    onPress={() => router.push(`/(app)/boxes/${item.id}`)}
                  />
                </View>
              )}
            />
          </View>
        )}

        {recentBoxes.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant-closed" size={64} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No boxes yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first box to start organizing.
            </Text>
            <TouchableOpacity
              style={styles.createBoxButton}
              onPress={() => router.push('/(app)/boxes/create')}
            >
              <Text style={styles.createBoxButtonText}>Create a Box</Text>
            </TouchableOpacity>
          </View>
        )}

        <AdBanner isPro={profile?.is_pro ?? false} />
      </ScrollView>

      <QRScanner
        visible={scannerVisible}
        onScan={handleScan}
        onClose={() => setScannerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  greeting: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F1F3D',
    marginBottom: 2,
  },
  greetingSubtext: {
    fontSize: 15,
    color: '#6B7280',
  },
  scanButton: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#F5A623',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
    elevation: 2,
    shadowColor: '#F5A623',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  scanButtonText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F1F3D',
  },
  searchBar: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F1F3D',
  },
  sectionLink: {
    fontSize: 14,
    color: '#F5A623',
    fontWeight: '600',
  },
  boxList: {
    paddingHorizontal: 14,
    gap: 4,
  },
  boxCardWrapper: {
    width: 180,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F1F3D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  createBoxButton: {
    backgroundColor: '#0F1F3D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createBoxButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
