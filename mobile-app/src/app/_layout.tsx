import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../context/AppContext';
import { colors } from '../theme';
import { KeyboardRoot } from '../components/KeyboardRoot';

export default function RootLayout() {
  return <SafeAreaProvider><KeyboardRoot><AppProvider><StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="cadastro" options={{ presentation: 'modal' }} />
      <Stack.Screen name="item/[id]" />
      <Stack.Screen name="ajustes" />
    </Stack>
  </AppProvider></KeyboardRoot></SafeAreaProvider>;
}
