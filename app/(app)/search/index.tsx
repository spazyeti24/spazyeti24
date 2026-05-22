import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHousehold } from '../../../src/contexts/HouseholdContext';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { supabase } from '../../../src/lib/supabase';
import { getBoxes } from '../../../src/lib/storage';
import { Box } from '../../../src/types';
import { TagChip } from '../../../src/components/ui/TagChip';

function highlight(text: string, query: string): JSX.Element {
  if (!query.trim()) return <Text>{text}</Text>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <Text>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} style={styles.highlight}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

export default function SearchScreen(): JSX.Element {
  const { q: initialQuery } = useLocalSearchParams<{ q?: string }>();
  const { currentHousehold } = useHousehold();
  const { isOnline } = useNetworkStatus();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<Box[]>([]);
  const [allBoxes, setAllBoxes] = useState<Box[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load all boxes for offline search
  const loadBoxes = useCallback(async () => {
    if (!currentHousehold) return;
    try {
      if (isOnline) {
        const { data } = await supabase
          .from('boxes')
          .select('*')
          .eq('household_id', currentHousehold.id)
          .eq('is_archived', false);
        setAllBoxes((data ?? []) as Box[]);
      } else {
        const cached = await getBoxes(currentHousehold.id);
        setAllBoxes(cached ?? []);
      }
    } catch {
      const cached = await getBoxes(currentHousehold?.id ?? '');
      setAllBoxes(cached ?? []);
    }
  }, [currentHousehold, isOnline]);

  useEffect(() => {
    loadBoxes();
  }, [loadBoxes]);

  // Auto-focus
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const performSearch = useCallback(
    (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      setIsLoading(true);
      setHasSearched(true);
      const lower = q.toLowerCase();
      const filtered = allBoxes.filter((box) => {
        return (
          box.name.toLowerCase().includes(lower) ||
          (box.description?.toLowerCase().includes(lower) ?? false) ||
          (box.location?.toLowerCase().includes(lower) ?? false) ||
          box.tags.some((t) => t.toLowerCase().includes(lower))
        );
      });
      setResults(filtered);
      setIsLoading(false);
    },
    [allBoxes]
  );

  useEffect(() => {
    const debounce = setTimeout(() => performSearch(query), 200);
    return () => clearTimeout(debounce);
  }, [query, performSearch]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBarContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search boxes, tags, locations..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setHasSearched(false); }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#F5A623" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={() => router.push(`/(app)/boxes/${item.id}`)}
            >
              <View style={styles.resultIcon}>
                <MaterialCommunityIcons name="package-variant-closed" size={22} color="#0F1F3D" />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{highlight(item.name, query)}</Text>
                {item.location ? (
                  <View style={styles.resultLocation}>
                    <MaterialCommunityIcons name="map-marker-outline" size={12} color="#6B7280" />
                    <Text style={styles.resultLocationText}>
                      {highlight(item.location, query)}
                    </Text>
                  </View>
                ) : null}
                {item.description ? (
                  <Text style={styles.resultDesc} numberOfLines={2}>
                    {highlight(item.description, query)}
                  </Text>
                ) : null}
                {item.tags.length > 0 ? (
                  <View style={styles.resultTags}>
                    {item.tags.slice(0, 3).map((tag) => (
                      <TagChip key={tag} label={tag} small variant="outlined" />
                    ))}
                  </View>
                ) : null}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              {!hasSearched ? (
                <>
                  <MaterialCommunityIcons name="magnify" size={72} color="#E5E7EB" />
                  <Text style={styles.emptyTitle}>Search your boxes</Text>
                  <Text style={styles.emptySubtext}>
                    Search by box name, description, location, or tag.
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="text-search" size={72} color="#E5E7EB" />
                  <Text style={styles.emptyTitle}>No results</Text>
                  <Text style={styles.emptySubtext}>
                    No boxes match "{query}". Try different keywords.
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  searchHeader: {
    backgroundColor: '#0F1F3D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F1F3D',
    height: '100%',
  },
  clearBtn: { padding: 4 },
  cancelText: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 48,
    flexGrow: 1,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: { flex: 1 },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F1F3D',
    marginBottom: 3,
  },
  resultLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 3,
  },
  resultLocationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  resultDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 4,
  },
  resultTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: -3,
  },
  highlight: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontWeight: '700',
  },
  center: {
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
    lineHeight: 20,
  },
});
