import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui';
import { ConnectionState } from '../../components/ConnectionState';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme';

export default function TabLayout() {
  const { status } = useApp();
  const insets = useSafeAreaInsets();
  if (status !== 'ready') return <ConnectionState />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primaryDark,
    tabBarInactiveTintColor: '#78847A', tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: 3 },
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 72 + Math.max(insets.bottom, 10),
      paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10) }, sceneStyle: { backgroundColor: colors.background },
    tabBarItemStyle: { paddingVertical: 2 } }}>
    <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarIcon: ({ color }) => <Icon name="sunny-outline" color={color} /> }} />
    <Tabs.Screen name="cuidados" options={{ title: 'Cuidados', tabBarIcon: ({ color }) => <Icon name="heart-outline" color={color} /> }} />
    <Tabs.Screen name="estoque" options={{ title: 'Estoque', tabBarIcon: ({ color }) => <Icon name="cube-outline" color={color} /> }} />
    <Tabs.Screen name="progresso" options={{ title: 'Progresso', tabBarIcon: ({ color }) => <Icon name="stats-chart-outline" color={color} /> }} />
  </Tabs>;
}
