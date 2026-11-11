import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, ConfirmModal, Field, Icon, Loading, Notice, Page, ScreenTitle } from '../../components/ui';
import { ConnectionState } from '../../components/ConnectionState';
import { useApp } from '../../context/AppContext';
import { useResource } from '../../hooks/useResource';
import { formatInstant, weekLabel } from '../../lib/dates';
import { positiveInteger } from '../../lib/validation';
import { colors, ui } from '../../theme';

export default function ItemDetailScreen() {
  const { id: param } = useLocalSearchParams<{ id: string }>();
  const id = Number(param);
  const { api, revision, refresh } = useApp();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [modal, setModal] = useState<'stock' | 'archive' | null>(null);
  const load = useCallback(async (signal: AbortSignal) => {
    void revision;
    const item = await api!.item(id, signal);
    const [stock, movements] = item.tipo === 'REMEDIO' ? await Promise.all([
      api!.estoque(id, signal), api!.movimentos(id, 0, signal).then((p) => p.conteudo),
    ]) : [null, []];
    return { item, stock, movements };
  }, [api, id, revision]);
  const { data, loading, error, reload } = useResource(load, !!api && Number.isInteger(id) && id > 0);

  function confirmStock() {
    setActionError('');
    if (positiveInteger(amount, 99999) === null) { setActionError('Informe uma quantidade inteira de 1 a 99.999.'); return; }
    setModal('stock');
  }

  async function perform() {
    if (!api || !data || lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError('');
    setMessage('');
    try {
      if (modal === 'stock') {
        await api.repor(id, Number(amount));
        setMessage('Reposição registrada. Seu estoque foi atualizado.');
        setAmount('');
      } else {
        await api.ativar(id, !data.item.ativo);
        setMessage(data.item.ativo ? 'Cuidado arquivado. Seu histórico foi preservado.' : 'Cuidado reativado.');
      }
      setModal(null);
      refresh();
    } catch (e) {
      setModal(null);
      setActionError(e instanceof Error ? e.message : 'Não foi possível concluir a ação.');
      reload();
    } finally { lock.current = false; setBusy(false); }
  }

  if (!api) return <ConnectionState />;
  return <Page back title="Seu cuidado">
    <Notice text={actionError || error} onRetry={reload} /><Notice text={message} tone="success" />
    {loading ? <Loading /> : data ? <>
      <View style={ui.card}>
        <View style={ui.between}><View style={{ padding: 16, borderRadius: 20, backgroundColor: data.item.tipo === 'HABITO' ? colors.purpleLight : colors.mint }}>
          <Icon name={data.item.tipo === 'HABITO' ? 'leaf-outline' : 'medical-outline'} size={32} color={data.item.tipo === 'HABITO' ? colors.purple : colors.primary} />
        </View><Badge tone={data.item.ativo ? 'green' : 'gray'}>{data.item.ativo ? 'Ativo' : 'Arquivado'}</Badge></View>
        <ScreenTitle title={data.item.nome} subtitle={data.item.dose || (data.item.tipo === 'HABITO' ? 'Um hábito para o seu bem-estar.' : `${data.item.qtdPorDose} unidade(s) por dose.`)} />
        <View style={[ui.row, { gap: 10 }]}><Icon name="calendar-outline" size={18} /><Text style={[ui.body, { flex: 1 }]}>{weekLabel(data.item.diasSemana)}</Text></View>
        <View style={[ui.row, { gap: 10 }]}><Icon name="time-outline" size={18} /><Text style={[ui.body, { flex: 1 }]}>{data.item.horarios.map((h) => h.hora).join(' · ')}</Text></View>
        <Button icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/cadastro', params: { id: String(id) } })}>Editar cuidado</Button>
      </View>
      {data.stock && <>
        <View style={ui.card}><Text style={ui.heading}>Seu estoque</Text>
          <View style={[ui.row, { alignItems: 'baseline', gap: 8 }]}><Text style={{ fontSize: 48, fontWeight: '800', color: colors.primaryDark, letterSpacing: -2 }}>{data.stock.estoqueAtual}</Text>
            <Text style={ui.muted}>unidades disponíveis</Text></View>
          <Badge tone={data.stock.precisaReposicao ? 'amber' : 'green'}>{data.stock.precisaReposicao ? 'Hora de planejar a reposição' : 'Estoque acompanhado'}</Badge>
          <Text style={ui.muted}>{data.stock.consumoSemanal} unidades previstas por semana.</Text>
          {data.stock.primeiraDoseSemSaldo && <Text style={ui.body}>Primeira dose sem saldo: {formatInstant(data.stock.primeiraDoseSemSaldo)}.</Text>}
          <Text style={ui.muted}>Previsão baseada na sua agenda atual e na realização de todas as doses futuras.</Text>
        </View>
        <View style={ui.card}><Text style={ui.heading}>Chegou mais remédio?</Text>
          <Field label="Quantidade para adicionar" placeholder="Ex.: 30" keyboardType="number-pad" inputMode="numeric" maxLength={5}
            value={amount} editable={!busy} onChangeText={setAmount} />
          <Button icon="add" onPress={confirmStock} disabled={busy}>Registrar reposição</Button>
        </View>
        <View style={ui.card}><Text style={ui.heading}>Últimos movimentos</Text>
          {data.movements.length === 0 ? <Text style={ui.muted}>As confirmações e reposições aparecerão aqui.</Text> : data.movements.slice(0, 20).map((movement) => <View key={movement.idMovimento} style={[ui.between, { paddingVertical: 10 }]}>
            <View style={{ flex: 1, gap: 4 }}><Text style={[ui.body, { fontWeight: '600' }]}>{movement.tipo === 'BAIXA' ? 'Dose confirmada' : 'Reposição'}</Text>
              <Text style={ui.muted}>{formatInstant(movement.dtMovimento)}</Text></View>
            <Text style={{ color: movement.tipo === 'BAIXA' ? colors.muted : colors.primary, fontSize: 19, fontWeight: '700' }}>{movement.tipo === 'BAIXA' ? '−' : '+'}{movement.quantidade}</Text>
          </View>)}
          {data.movements.length > 20 && <Text style={ui.muted}>Exibindo os 20 movimentos mais recentes.</Text>}
        </View>
      </>}
      <Button variant={data.item.ativo ? 'danger' : 'secondary'} icon={data.item.ativo ? 'archive-outline' : 'refresh-outline'}
        disabled={busy} onPress={() => setModal('archive')}>{data.item.ativo ? 'Arquivar cuidado' : 'Reativar cuidado'}</Button>
      <Text style={[ui.muted, { textAlign: 'center' }]}>Arquivar preserva seu histórico. Novos lembretes deixam de ser criados.</Text>
    </> : !error && <Notice text="Cuidado não encontrado." />}
    <ConfirmModal visible={!!modal} title={modal === 'stock' ? 'Confirmar reposição?' : data?.item.ativo ? 'Arquivar esse cuidado?' : 'Reativar esse cuidado?'}
      text={modal === 'stock' ? `Adicionar ${amount} unidades ao estoque de ${data?.item.nome || ''}?`
        : data?.item.ativo ? 'Novas ocorrências e notificações desse cuidado serão interrompidas. O histórico continua disponível.' : 'Esse cuidado voltará à sua agenda.'}
      confirmLabel={modal === 'stock' ? 'Sim, adicionar ao estoque' : data?.item.ativo ? 'Arquivar' : 'Reativar'} danger={modal === 'archive' && data?.item.ativo}
      busy={busy} onClose={() => setModal(null)} onConfirm={() => void perform()} />
  </Page>;
}
