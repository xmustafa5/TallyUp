import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { selectionFeedback } from '@/lib/haptics';

export default function TabLayout() {
  const theme = colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => selectionFeedback(),
        }}
      />
      <Tabs.Screen
        name="(today)"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => selectionFeedback(),
        }}
      />
      <Tabs.Screen
        name="(makeup)"
        options={{
          title: 'Makeup',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="refresh-circle" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => selectionFeedback(),
        }}
      />
      <Tabs.Screen
        name="(more)"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal-circle" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => selectionFeedback(),
        }}
      />
    </Tabs>
  );
}
