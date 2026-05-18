import { Tabs } from 'expo-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  const t = colors.light;

  const tab = (active: IconName) =>
    function TabIcon({ color, size }: { color: string; size: number }) {
      return <Icon name={active} size={size} color={color} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: t.tabBarActive,
        tabBarInactiveTintColor: t.tabBarInactive,
        tabBarStyle: {
          backgroundColor: t.tabBar,
          borderTopColor: t.tabBarBorder,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Rooms', tabBarIcon: tab('trophy-outline') }}
      />
      <Tabs.Screen
        name="activity"
        options={{ title: 'Activity', tabBarIcon: tab('pulse-outline') }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: tab('notifications-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tab('person-outline') }}
      />
    </Tabs>
  );
}
