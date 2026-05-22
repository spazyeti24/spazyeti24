import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TagChipProps {
  label: string;
  onRemove?: () => void;
  variant?: 'filled' | 'outlined';
  small?: boolean;
}

export function TagChip({ label, onRemove, variant = 'filled', small = false }: TagChipProps) {
  const isFilled = variant === 'filled';
  return (
    <View style={[styles.chip, isFilled ? styles.filled : styles.outlined, small && styles.small]}>
      <Text
        style={[styles.label, isFilled ? styles.labelFilled : styles.labelOutlined, small && styles.labelSmall]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
          <MaterialCommunityIcons
            name="close"
            size={small ? 12 : 14}
            color={isFilled ? '#FFFFFF' : '#0F1F3D'}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 3,
  },
  filled: {
    backgroundColor: '#0F1F3D',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#0F1F3D',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 2,
  },
  labelSmall: {
    fontSize: 11,
  },
  labelFilled: {
    color: '#FFFFFF',
  },
  labelOutlined: {
    color: '#0F1F3D',
  },
});
