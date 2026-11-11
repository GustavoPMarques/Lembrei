import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { ui } from '../theme';
import { Button, Empty, Loading, Page } from './ui';

export function ConnectionState() {
  const { status, error, reconnect } = useApp();
  return <Page><View style={{ paddingTop: 64, gap: 24 }}>
    {status === 'loading' ? <Loading text="Conectando aos seus cuidados…" /> : <>
      <Empty icon="cloud-offline-outline" title="Vamos reconectar?" text={error || 'Não foi possível acessar a API.'}
        action={<Button icon="refresh-outline" onPress={() => void reconnect()}>Tentar novamente</Button>} />
      <Text style={[ui.muted, { textAlign: 'center' }]}>Se esta é a primeira abertura, confira o endereço do servidor nos ajustes.</Text>
      <Button variant="secondary" icon="settings-outline" onPress={() => router.push('/ajustes')}>Configurar conexão</Button>
    </>}
  </View></Page>;
}
