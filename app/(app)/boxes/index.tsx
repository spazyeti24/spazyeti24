import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { FAB } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StashTagHeader } from '../../../src/components/ui/StashTagHeader';
import { OfflineBanner } from '../../../src/components/ui/OfflineBanner';
import { BoxCard } from '../../../src/components/ui/BoxCard';
import { AdBanner } from '../../../src/components/ui/AdBanner';
import { TagChip } from '../../../src/components/ui/TagChip';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useHousehold } from '../../../src/contexts/HouseholdContext';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { supabase } from '../../../src/lib/supabase';
import { saveBoxes, getBoxes } from '../../../src/lib/storage';
import { Box } from '../../../src/types';

type ViewMode = 'grid' | 'list';

export default function BoxesScreen(): JSX.Element {
  const { profile } = useAuth();
  const { currentHousehold, userRole } = useHousehold();
  const { isOnline } = useNetworkStatus();

  const [boxes, setBoxes] = useState<Box[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Derived filter options
  const allTags = Array.from(new Set(boxes.flatMap((b) => b.tags)));
  const allLocations = Array.from(
    new Set(boxes.map((b) => b.location).filter((l): l is string => !!l))
  );

  const filteredBoxes = boxes.filter((b) => {
    if (selectedTag && !b.tags.includes(selectedTag)) return false;
    if (selectedLocation && b.location !== selectedLocation) return false;
    return true;
  });

  const fetchBoxes = useCallback(async () => {
    if (!currentHousehold) return;
    setIsLoading(true);
    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('boxes')
          .select('*')
          .eq('household_id', currentHousehold.id)
          .eq('is_archived', false)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        const list = (data ?? []) as Box[];
        setBoxes(list);
        await saveBoxes(currentHousehold.id, list);
      } else {
        const cached = await getBoxes(currentHousehold.id);
        if (cached) setBoxes(cached);
      }
    } catch (err) {
      console.error('[Boxes] fetchBoxes:', err);
      const cached = await getBoxes(currentHousehold?.id ?? '');
      if (cached) setBoxes(cached);
    } finally {
      setIsLoading(false);
    }
  }, [currentHousehold, isOnline]);

  useEffect(() => {
    fetchBoxes();
  }, [fetchBoxes]);

  const canEdit = userRole === 'head' || userRole === 'editor';
  const numColumns = viewMode === 'grid' ? 2 : 1;

  return (
    <SafeAreaView style={styles.safe}>
      <StashTagHeader />
      <OfflineBanner />

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>
          {filteredBoxes.length} {filteredBoxes.length === 1 ? 'Box' : 'Boxes'}
        </Text>
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setViewMode((m) => (m === 'grid' ? 'list' : 'grid'))}
        >
          <MaterialCommunityIcons
            name={viewMode === 'grid' ? 'view-list' : 'view-grid'}
            size={22}
            color="#0F1F3D"
          />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      {(allTags.length > 0 || allLocations.length > 0) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {selectedTag || selectedLocation ? (
            <TouchableOpacity
              style={styles.clearFilter}
              onPress={() => { setSelectedTag(null); setSelectedLocation(null); }}
            >
              <MaterialCommunityIcons name="close-circle" size={14} color="#EF4444" />
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
          {allLocations.map((loc) => (
            <TouchableOpacity
              key={`loc:${loc}`}
              onPress={() => setSelectedLocation(selectedLocation === loc ? null : loc)}
            >
              <TagChip
                label={`📍 ${loc}`}
                variant={selectedLocation === loc ? 'filled' : 'outlined'}
              />
            </TouchableOpacity>
          ))}
          {allTags.map((tag) => (
            <TouchableOpacity
              key={`tag:${tag}`}
              onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              <TagChip
                label={tag}
                variant={selectedTag === tag ? 'filled' : 'outlined'}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        key={viewMode}
        data={filteredBoxes}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchBoxes} tintColor="#F5A623" />
        }
        contentContainerStyle={[
          styles.listContent,
          filteredBoxes.length === 0 && styles.listContentEmpty,
        ]}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        renderItem={({ item }) => (
          <BoxCard
            box={item}
            viewMode={viewMode}
            onPress={() => router.push(`/(app)/boxes/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="package-variant-closed" size={72} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No boxes found</Text>
              <Text style={styles.emptySubtext}>
                {selectedTag || selectedLocation
                  ? 'Try removing filters to see all boxes.'
                  : 'Tap + to create your first box.'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          filteredBoxes.length > 0 ? <AdBanner isPro={profile?.is_pro ?? false} /> : null
        }
      />

      {canEdit && (
        <FAB
          icon="plus"
          style={styles.fab}
          color="#FFFFFF"
          onPress={() => router.push('/(app)/boxes/create')}
          customSize={56}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1F3D',
  },
  viewToggle: {
    padding: 4,
  },
  filterBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 4,
  },
  clearFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginHorizontal: 3,
    gap: 4,
  },
  clearFilterText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  listContent: {
    padding: 8,
    paddingBottom: 80,
  },
  listContentEmpty: {
    flex: 1,
  },
  gridRow: {
    justifyContent: 'flex-start',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#0F1F3D',
    borderRadius: 28,
  },
});
