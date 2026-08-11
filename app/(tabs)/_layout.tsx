import { Tabs } from 'expo-router';
import { CircleUserRound, House, Settings2, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../src/hooks/use-app-theme';
import { palette } from '../../src/theme/tokens';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.aquaDeep,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 82, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <House color={color} size={22} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <CircleUserRound color={color} size={22} /> }} />
      <Tabs.Screen name="store" options={{ title: t('tabs.store'), tabBarIcon: ({ color }) => <Sparkles color={color} size={22} /> }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: ({ color }) => <Settings2 color={color} size={22} /> }} />
    </Tabs>
  );
}
