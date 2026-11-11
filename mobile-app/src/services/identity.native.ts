import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';

let pending: Promise<string> | undefined;

export function getDeviceId(): Promise<string> {
  pending ??= (async () => {
    let uuid = await SecureStore.getItemAsync('lembrei.device-id');
    if (!uuid) {
      uuid = randomUUID();
      await SecureStore.setItemAsync('lembrei.device-id', uuid);
    }
    return uuid;
  })().catch((error) => { pending = undefined; throw error; });
  return pending;
}
