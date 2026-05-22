import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { AuthProvider } from '../src/contexts/AuthContext';
import { HouseholdProvider } from '../src/contexts/HouseholdContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

SplashScreen.preventAutoHideAsync();

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F1F3D',
    secondary: '#F5A623',
  },
};

export default function RootLayout(): JSX.Element | null {
  const [fontsLoaded, fontError] = useFonts({
    // Using system fonts — add custom fonts here if needed
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <PaperProvider theme={paperTheme}>
        <AuthProvider>
          <HouseholdProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </HouseholdProvider>
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
