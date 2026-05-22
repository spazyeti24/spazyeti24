import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout(): JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F1F3D' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
