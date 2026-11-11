import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

let pending: Promise<string> | undefined;

export function getDeviceId(): Promise<string> {
  pending ??= (async () => {
    let uuid = await AsyncStorage.getItem('lembrei.device-id');
    if (!uuid) {
      uuid = randomUUID();
      await AsyncStorage.setItem('lembrei.device-id', uuid);
    }
    return uuid;
  })().catch((error) => { pending = undefined; throw error; });
  return pending;
}
