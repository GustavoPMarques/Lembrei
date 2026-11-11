import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Empty, Icon, IconButton, listContent, Loading, Notice, Page, ProgressBar, ScreenTitle } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useResource } from '../../hooks/useResource';
import { addDays, formatDay, monday, today } from '../../lib/dates';
import { colors, ui } from '../../theme';

export default function ProgressScreen() {
  const { api, revision } = useApp();
  const [week, setWeek] = useState(() => monday(today()));
  const load = useCallback(async (signal: AbortSignal) => {
    void revision;
    const end = addDays(week, 6) < today() ? addDays(week, 6) : today();
    if (week <= end) await api!.gerar(week, end, signal);
    return api!.relatorio(week, signal);
  }, [api, revision, week]);
  const { data, loading, error, reload } = useResource(load, !!api);
  const total = data?.itens.reduce((sum, i) => sum + i.totalPrevisto, 0) || 0;
  const completed = data?.itens.reduce((sum, i) => sum + i.totalTomado, 0) || 0;
  const missed = data?.itens.reduce((sum, i) => sum + i.totalEsquecido, 0) || 0;
  const percent = total ? Math.round(completed / total * 100) : 0;
  return <Page scroll={false}><FlatList data={data?.itens || []} keyExtractor={(i) => String(i.idItem)} contentContainerStyle={listContent}
    refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={colors.primary} />}
    ListHeaderComponent={<View style={{ gap: 22, marginBottom: 14 }}>
      <ScreenTitle eyebrow="Cada cuidado faz diferença" title="Seu progresso" subtitle="Uma semana de cada vez, sem cobranças." />
      <View style={ui.between}><IconButton name="chevron-back" label="Semana anterior" onPress={() => setWeek(addDays(week, -7))} />
        <View style={{ alignItems: 'center', flex: 1, gap: 4 }}><Text style={[ui.body, { fontWeight: '700' }]}>{formatDay(week)} a {formatDay(addDays(week, 6))}</Text>
          <Text style={ui.muted}>{week === monday(today()) ? 'Esta semana' : 'Semana selecionada'}</Text></View>
        <IconButton name="chevron-forward" label="Próxima semana" disabled={week >= monday(today())} onPress={() => setWeek(addDays(week, 7))} /></View>
      <View style={[ui.card, { alignItems: 'center', paddingVertical: 30, gap: 22 }]}>
        <View style={{ width: 144, height: 144, borderRadius: 72, borderWidth: 10, borderColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color: colors.primaryDark, letterSpacing: -2 }}>{percent}%</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>de adesão</Text>
        </View>
        <View style={{ width: '100%', maxWidth: 320 }}><ProgressBar percent={percent} /></View>
        <Text style={[ui.heading, { textAlign: 'center' }]}>{!total ? 'Seu progresso começa aos poucos.' : percent === 100 ? 'Uma semana de cuidados em dia!' : 'Cada confirmação é um passo.'}</Text>
        <View style={[ui.row, { width: '100%' }]}>{[
          [String(completed), 'Feitos', colors.primary], [String(total - completed - missed), 'Pendentes', colors.amber], [String(missed), 'Esquecidos', colors.muted],
        ].map(([value, label, color]) => <View key={label} style={{ flex: 1, alignItems: 'center', gap: 5 }}><Text style={{ fontSize: 26, fontWeight: '800', color }}>{value}</Text><Text style={[ui.muted, { fontSize: 12 }]}>{label}</Text></View>)}</View>
      </View>
      <View style={ui.between}><Text style={ui.heading}>Cuidado por cuidado</Text><Icon name="heart-outline" size={21} /></View>
      <Notice text={error} onRetry={reload} />
    </View>}
    renderItem={({ item }) => <View style={ui.card}>
      <View style={ui.between}><Text style={[ui.body, { fontWeight: '700', flex: 1 }]}>{item.nome}</Text><Text style={ui.link}>{Number(item.percentualAdesao).toLocaleString('pt-BR')}%</Text></View>
      <ProgressBar percent={Number(item.percentualAdesao)} color={item.tipo === 'HABITO' ? colors.purple : colors.primary} />
      <Text style={ui.muted}>{item.totalTomado} de {item.totalPrevisto} cuidados confirmados.</Text>
    </View>}
    ListEmptyComponent={loading ? <Loading text="Preparando sua semana…" /> : !error ? <Empty icon="stats-chart-outline" title="Ainda não há registros nessa semana" text="Seus cuidados aparecem aqui conforme os horários chegam. Você pode conferir a semana atual ou cadastrar sua rotina." /> : null}
    ListFooterComponent={<Text style={[ui.muted, { marginTop: 18, textAlign: 'center', fontSize: 12 }]}>A adesão considera os horários que já passaram. A rotina é gerada com a agenda cadastrada atualmente.</Text>}
  /></Page>;
}
