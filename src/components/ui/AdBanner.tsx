import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AdBannerProps {
  isPro: boolean;
}

export function AdBanner({ isPro }: AdBannerProps): JSX.Element | null {
  if (isPro) return null;

  return (
    <View style={styles.container}>
      <View style={styles.adBox}>
        <Text style={styles.label}>Advertisement</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  adBox: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
