import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline, isLoading } = useNetworkStatus();
  const translateY = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    if (isLoading) return;
    Animated.timing(translateY, {
      toValue: isOnline ? -40 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, isLoading]);

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Text style={styles.text}>You're offline — showing cached data</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F5A623',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#0F1F3D',
    fontSize: 13,
    fontWeight: '600',
  },
});
