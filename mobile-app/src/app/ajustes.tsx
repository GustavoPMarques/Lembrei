import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Field, Icon, Notice, Page, ScreenTitle } from '../components/ui';
import { useApp } from '../context/AppContext';
import { ui } from '../theme';

export default function SettingsScreen() {
  const { baseUrl, profile, uuid, status, error, saveConnection, saveName } = useApp();
  const [urlDraft, setUrl] = useState<string | null>(null);
  const [nameDraft, setName] = useState<string | null>(null);
  const url = urlDraft ?? baseUrl;
  const name = nameDraft ?? (profile?.nome === 'Você' ? '' : profile?.nome || '');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  async function run(key: string, task: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(key); setActionError(''); setMessage('');
    try { await task(); setMessage(success); }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { setBusy(''); }
  }

  return <Page back title="Ajustes">
    <ScreenTitle eyebrow="Do seu jeito" title="Um app que cuida com você." subtitle="Personalize sua experiência e confira seus dados." />
    <Notice text={actionError} /><Notice text={message} tone="success" />
    <View style={ui.card}><View style={[ui.row, { gap: 10 }]}><Icon name="person-outline" /><Text style={ui.heading}>Como podemos te chamar?</Text></View>
      <Field label="Seu nome" placeholder="Ex.: Maria" maxLength={60} value={name} onChangeText={setName} editable={!busy} />
      <Button variant="secondary" onPress={() => void run('name', () => saveName(name), 'Seu nome foi atualizado.')} loading={busy === 'name'} disabled={!!busy || status !== 'ready'}>Salvar nome</Button>
      <Text style={ui.muted}>Sem login e sem senha. Seus cuidados ficam vinculados a esta instalação.</Text>
    </View>
    <View style={ui.card}><View style={ui.between}><Text style={ui.heading}>Conexão</Text><Badge tone={status === 'ready' ? 'green' : 'amber'}>{status === 'ready' ? 'Conectado' : status === 'loading' ? 'Conectando' : 'Sem conexão'}</Badge></View>
      <Notice text={status === 'error' ? error : ''} />
      <Field label="Endereço do servidor" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={!busy}
        placeholder="https://lembrei-api.onrender.com/api/v1" hint="O app usa um serviço online para acessar seus cuidados. Altere este endereço apenas se precisar usar outro servidor." />
      <Button variant="secondary" icon="refresh-outline" loading={busy === 'connection'} disabled={!!busy}
        onPress={() => void run('connection', () => saveConnection(url), 'Configuração salva. Confira o estado da conexão acima.')}>Salvar e conectar</Button>
      <Text style={ui.muted}>Após um tempo sem uso, o serviço pode demorar para responder. Aguarde um pouco e tente conectar novamente.</Text>
      <Text style={ui.muted}>Fuso dos cuidados: São Paulo (UTC−3).</Text>
    </View>
    <View style={ui.card}><View style={[ui.row, { gap: 10 }]}><Icon name="shield-checkmark-outline" /><Text style={ui.heading}>Sobre seus dados</Text></View>
      <Text style={ui.muted}>O aplicativo usa um identificador próprio, sem acessar o número de série do celular. A versão web e o celular têm identificadores separados.</Text>
      <Text selectable style={[ui.muted, { fontSize: 12 }]}>Identificador desta instalação: {uuid || 'Preparando…'}</Text>
      <Text style={ui.muted}>Não compartilhe esse identificador. Quem possui o valor pode acessar os cuidados vinculados a ele.</Text>
    </View>
    <Text style={[ui.muted, { textAlign: 'center', fontSize: 12 }]}>Lembrei! · Cuidar cabe no seu dia.{ '\n' }CitizenTech · ODS 3 — Saúde e Bem-Estar</Text>
  </Page>;
}
