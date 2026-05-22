import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface TabIconProps {
  name: IconName;
  color: string;
  size: number;
}

function TabIcon({ name, color, size }: TabIconProps): JSX.Element {
  return <MaterialCommunityIcons name={name} color={color} size={size} />;
}

export default function AppLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#0F1F3D',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIndicatorStyle: styles.tabIndicator,
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="boxes/index"
        options={{
          title: 'Boxes',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="package-variant-closed" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search/index"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="magnify" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="household/index"
        options={{
          title: 'Household',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="account-group-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account/index"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="account-circle-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Hidden screens (not shown in tab bar) */}
      <Tabs.Screen name="boxes/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="boxes/create" options={{ href: null }} />
      <Tabs.Screen name="boxes/[id]/qr" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabIndicator: {
    backgroundColor: '#F5A623',
    height: 3,
    borderRadius: 2,
  },
});
