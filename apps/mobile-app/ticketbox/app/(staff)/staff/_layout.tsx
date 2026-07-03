import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radii } from '@/constants/theme';

export default function StaffTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          paddingBottom: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 0,
          height: 78,
          paddingTop: 10,
          paddingBottom: 12,
          backgroundColor: 'rgba(11, 24, 43, 0.96)',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          borderRadius: radii.xl,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
          elevation: 6,
        },
        tabBarItemStyle: {
          borderRadius: radii.lg,
          marginHorizontal: 4,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              color={color}
              name={focused ? 'view-grid' : 'view-grid-outline'}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              color={color}
              name={focused ? 'qrcode-scan' : 'qrcode-scan'}
              size={23}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              color={color}
              name={focused ? 'account-circle' : 'account-circle-outline'}
              size={23}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="session-setup"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
