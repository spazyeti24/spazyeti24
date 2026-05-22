import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Box } from '../../types';
import { TagChip } from './TagChip';

interface BoxCardProps {
  box: Box;
  viewMode: 'grid' | 'list';
  onPress: () => void;
}

const PLACEHOLDER_COLOR = '#E5E7EB';

export function BoxCard({ box, viewMode, onPress }: BoxCardProps): JSX.Element {
  const isGrid = viewMode === 'grid';

  return (
    <TouchableOpacity
      style={[styles.card, isGrid ? styles.gridCard : styles.listCard]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Photo */}
      {box.photo_url ? (
        <Image
          source={{ uri: box.photo_url }}
          style={isGrid ? styles.gridImage : styles.listImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[isGrid ? styles.gridImage : styles.listImage, styles.imagePlaceholder]}>
          <MaterialCommunityIcons name="package-variant-closed" size={isGrid ? 40 : 28} color="#9CA3AF" />
        </View>
      )}

      {/* Content */}
      <View style={[styles.content, isGrid ? styles.gridContent : styles.listContent]}>
        <Text style={styles.name} numberOfLines={2}>
          {box.name}
        </Text>
        {box.location ? (
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={12} color="#6B7280" />
            <Text style={styles.location} numberOfLines={1}>
              {box.location}
            </Text>
          </View>
        ) : null}

        {box.tags && box.tags.length > 0 ? (
          <View style={styles.tagRow}>
            {box.tags.slice(0, isGrid ? 2 : 3).map((tag) => (
              <TagChip key={tag} label={tag} small variant="outlined" />
            ))}
            {box.tags.length > (isGrid ? 2 : 3) ? (
              <Text style={styles.moreTag}>+{box.tags.length - (isGrid ? 2 : 3)}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  gridCard: {
    flex: 1,
    margin: 6,
  },
  listCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 6,
  },
  gridImage: {
    width: '100%',
    height: 120,
  },
  listImage: {
    width: 80,
    height: 80,
  },
  imagePlaceholder: {
    backgroundColor: PLACEHOLDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 10,
  },
  gridContent: {
    flex: 0,
  },
  listContent: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F1F3D',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 2,
  },
  location: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
    marginLeft: -3,
  },
  moreTag: {
    fontSize: 11,
    color: '#6B7280',
    alignSelf: 'center',
    marginLeft: 4,
  },
});
