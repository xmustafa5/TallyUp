import { Tabs } from 'expo-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { colors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';

export default function TabsLayout() {
  const t = colors.light;
  const { t: tr } = useI18n();

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
        options={{ title: tr('nav.rooms'), tabBarIcon: tab('trophy-outline') }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: tr('nav.activity'),
          tabBarIcon: tab('pulse-outline'),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: tr('nav.notifications'),
          tabBarIcon: tab('notifications-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tr('nav.profile'),
          tabBarIcon: tab('person-outline'),
        }}
      />
    </Tabs>
  );
}
