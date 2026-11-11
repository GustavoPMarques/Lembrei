import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { ApiClient } from '../services/api';
import { getDeviceId } from '../services/identity';
import { clearLegacyReminders } from '../services/legacyReminders';
import { resolveApiUrl } from '../lib/connection';
import { normalizeApiUrl } from '../lib/validation';
import type { Usuario } from '../types/api';

function defaultUrl(): string {
  return resolveApiUrl(Platform.OS, Constants.expoConfig?.hostUri, process.env.EXPO_PUBLIC_API_URL);
}

interface AppValue {
  api: ApiClient | null;
  profile: Usuario | null;
  uuid: string;
  baseUrl: string;
  status: 'loading' | 'ready' | 'error';
  error: string;
  revision: number;
  reconnect: () => Promise<void>;
  saveConnection: (url: string) => Promise<void>;
  saveName: (name: string) => Promise<void>;
  refresh: () => void;
}

const Context = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<ApiClient | null>(null);
  const [profile, setProfile] = useState<Usuario | null>(null);
  const [uuid, setUuid] = useState('');
  const [baseUrl, setBaseUrl] = useState(defaultUrl);
  const [status, setStatus] = useState<AppValue['status']>('loading');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const connect = useCallback(async (customUrl?: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const device = await getDeviceId();
      if (controller.signal.aborted) return;
      setStatus('loading');
      setError('');
      const url = normalizeApiUrl(customUrl ?? await AsyncStorage.getItem('lembrei.api-url') ?? defaultUrl());
      setUuid(device);
      setBaseUrl(url);
      const client = new ApiClient(url, device);
      const name = await AsyncStorage.getItem('lembrei.name') || 'Você';
      const user = await client.identificar(name, controller.signal);
      if (controller.signal.aborted) return;
      setApi(client);
      setProfile(user);
      setStatus('ready');
      setRevision((r) => r + 1);
    } catch (e) {
      if (controller.signal.aborted) return;
      setApi(null);
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Não foi possível abrir o aplicativo.');
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    void getDeviceId().then(() => {
      if (!disposed) void connect();
    }).catch(() => {
      if (!disposed) { setStatus('error'); setError('Não foi possível guardar o identificador desta instalação. Confira as permissões de armazenamento.'); }
    });
    return () => { disposed = true; controllerRef.current?.abort(); };
  }, [connect]);

  useEffect(() => {
    void AsyncStorage.removeItem('lembrei.notifications').then(clearLegacyReminders).catch(() => undefined);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setRevision((r) => r + 1);
    });
    return () => subscription.remove();
  }, []);

  const reconnect = useCallback(() => connect(), [connect]);
  const saveConnection = useCallback(async (value: string) => {
    const url = normalizeApiUrl(value);
    await AsyncStorage.setItem('lembrei.api-url', url);
    await connect(url);
  }, [connect]);
  const saveName = useCallback(async (name: string) => {
    if (!api) throw new Error('Conecte-se à API primeiro.');
    const clean = name.trim();
    if (!clean || clean.length > 60) throw new Error('Informe um nome com até 60 caracteres.');
    const result = await api.renomear(clean);
    setProfile(result);
    await AsyncStorage.setItem('lembrei.name', result.nome);
  }, [api]);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  const value = useMemo(() => ({ api, profile, uuid, baseUrl, status, error, revision,
    reconnect, saveConnection, saveName, refresh }),
  [api, profile, uuid, baseUrl, status, error, revision, reconnect, saveConnection, saveName, refresh]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider não encontrado.');
  return value;
}
