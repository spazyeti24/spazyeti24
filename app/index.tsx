import React from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';

export default function Index(): JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#F5A623" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(app)/home" />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0F1F3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
