import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Badge, Button, Empty, Icon, listContent, Loading, Notice, Page, ScreenTitle } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useResource } from '../../hooks/useResource';
import { formatInstant } from '../../lib/dates';
import { colors, ui } from '../../theme';

export default function StockScreen() {
  const { api, revision } = useApp();
  const load = useCallback(async (signal: AbortSignal) => {
    void revision;
    const [items, alerts] = await Promise.all([api!.all((page) => api!.itens(page, true, signal)), api!.all((page) => api!.alertas(page, signal))]);
    return { items: items.filter((i) => i.tipo === 'REMEDIO').sort((a, b) => Number(alerts.some((s) => s.idItem === b.idItem)) - Number(alerts.some((s) => s.idItem === a.idItem))), alerts };
  }, [api, revision]);
  const { data, loading, error, reload } = useResource(load, !!api);
  return <Page scroll={false}><FlatList data={data?.items || []} keyExtractor={(i) => String(i.idItem)} contentContainerStyle={listContent}
    refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={colors.primary} />}
    ListHeaderComponent={<View style={{ gap: 18, marginBottom: 12 }}>
      <ScreenTitle eyebrow="Um passo à frente" title="Estoque em dia" subtitle="Saiba quando repor, antes de precisar." />
      <View style={[ui.card, { backgroundColor: colors.amberLight, borderColor: '#EEDDBB', flexDirection: 'row', gap: 16 }]}>
        <View style={{ paddingTop: 4 }}><Icon name="cube-outline" color={colors.amber} size={30} /></View>
        <View style={{ flex: 1, gap: 6 }}><Text style={ui.heading}>{data?.alerts.length ? `${data.alerts.length} ${data.alerts.length === 1 ? 'estoque pede' : 'estoques pedem'} atenção` : 'Mais tranquilidade na rotina'}</Text>
          <Text style={ui.muted}>{data?.alerts.length ? 'Esses remédios podem faltar em até 3 dias. Planeje sua reposição.' : 'Acompanhe seus remédios e registre as reposições por aqui.'}</Text></View>
      </View>
      <View style={ui.between}><Text style={ui.heading}>Seus remédios</Text><Text style={ui.muted}>{data?.items.length ?? 0} ativos</Text></View>
      <Notice text={error} onRetry={reload} />
    </View>}
    renderItem={({ item }) => {
      const alert = data?.alerts.find((a) => a.idItem === item.idItem);
      return <View style={[ui.card, alert && { borderColor: '#E5CC9F' }]}>
        <View style={ui.between}><Text style={[ui.heading, { flex: 1 }]}>{item.nome}</Text>
          <Badge tone={alert ? 'amber' : 'green'}>{alert ? 'Repor em breve' : 'Acompanhado'}</Badge></View>
        <View style={[ui.row, { gap: 10, alignItems: 'baseline' }]}><Text style={{ fontSize: 38, fontWeight: '800', color: colors.primaryDark, letterSpacing: -1 }}>{item.estoqueAtual}</Text>
          <Text style={ui.muted}>unidades em estoque</Text></View>
        <Text style={ui.muted}>{item.qtdPorDose} unidade(s) por dose · {item.horarios.map((h) => h.hora).join(' · ')}</Text>
        {alert?.primeiraDoseSemSaldo && <View style={[ui.row, { gap: 8 }]}><Icon name="alert-circle-outline" color={colors.amber} size={18} />
          <Text style={[ui.muted, { color: colors.amber, flex: 1 }]}>Pode faltar a partir de {formatInstant(alert.primeiraDoseSemSaldo)}.</Text></View>}
        <Button variant={alert ? 'primary' : 'secondary'} icon="add" onPress={() => router.push(`/item/${item.idItem}`)}>Ver estoque e repor</Button>
      </View>;
    }}
    ListEmptyComponent={loading ? <Loading /> : !error ? <Empty icon="cube-outline" title="Seu estoque começa aqui" text="Cadastre um remédio e informe a quantidade que você tem. As confirmações atualizam o saldo automaticamente."
      action={<Button icon="add" onPress={() => router.push('/cadastro')}>Adicionar remédio</Button>} /> : null}
    ListFooterComponent={data?.items.length ? <Text style={[ui.muted, { textAlign: 'center', fontSize: 12, marginTop: 16 }]}>As previsões consideram os horários e o consumo cadastrados.</Text> : null}
  /></Page>;
}
