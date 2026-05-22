import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OnboardingScreen(): JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1F3D" />
      <View style={styles.inner}>
        {/* Logo area */}
        <View style={styles.logoSection}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="qrcode-scan" size={56} color="#F5A623" />
          </View>
          <Text style={styles.logo}>
            Stash<Text style={styles.logoAccent}>Tag</Text>
          </Text>
          <Text style={styles.tagline}>Everything in its place.</Text>
        </View>

        {/* Description */}
        <View style={styles.descSection}>
          <Text style={styles.descText}>
            Label your moving boxes, holiday storage, and home inventory with custom QR codes.
            Scan any box to instantly see what's inside — no more guessing.
          </Text>

          <View style={styles.featureRow}>
            <MaterialCommunityIcons name="qrcode" size={20} color="#F5A623" />
            <Text style={styles.featureText}>Scan QR codes to find anything instantly</Text>
          </View>
          <View style={styles.featureRow}>
            <MaterialCommunityIcons name="account-group-outline" size={20} color="#F5A623" />
            <Text style={styles.featureText}>Share with family — everyone stays in sync</Text>
          </View>
          <View style={styles.featureRow}>
            <MaterialCommunityIcons name="wifi-off" size={20} color="#F5A623" />
            <Text style={styles.featureText}>Works offline when you need it most</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1F3D',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245,166,35,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.3)',
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  logoAccent: {
    color: '#F5A623',
  },
  tagline: {
    fontSize: 20,
    color: '#CBD5E1',
    fontWeight: '400',
    fontStyle: 'italic',
  },
  descSection: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  descText: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#CBD5E1',
    flex: 1,
  },
  buttonSection: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#F5A623',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0F1F3D',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
