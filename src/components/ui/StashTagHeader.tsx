import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HouseholdSwitcher } from './HouseholdSwitcher';

interface StashTagHeaderProps {
  showSwitcher?: boolean;
}

export function StashTagHeader({ showSwitcher = true }: StashTagHeaderProps): JSX.Element {
  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>
          Stash<Text style={styles.logoAccent}>Tag</Text>
        </Text>
      </View>
      {showSwitcher && <HouseholdSwitcher />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0F1F3D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoAccent: {
    color: '#F5A623',
  },
});
