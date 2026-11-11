import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { Badge, Button, Empty, Icon, listContent, Loading, Notice, Page, ScreenTitle } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useResource } from '../../hooks/useResource';
import { weekLabel } from '../../lib/dates';
import { colors, ui } from '../../theme';
import type { Item, TipoItem } from '../../types/api';

export default function CareScreen() {
  const { api, revision } = useApp();
  const [filter, setFilter] = useState<TipoItem | 'TODOS'>('TODOS');
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState('');
  const load = useCallback((signal: AbortSignal) => { void revision; return api!.all((page) => api!.itens(page, !archived, signal)); }, [api, archived, revision]);
  const { data, loading, error, reload } = useResource(load, !!api);
  const items = useMemo(() => (data || []).filter((i) => (filter === 'TODOS' || i.tipo === filter) && i.nome.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))), [data, filter, search]);

  function renderItem({ item }: { item: Item }) {
    return <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${item.nome}`} onPress={() => router.push(`/item/${item.idItem}`)}
      style={({ pressed }) => [ui.card, pressed && { borderColor: colors.primary }]}>
      <View style={ui.between}><View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: item.tipo === 'HABITO' ? colors.purpleLight : colors.mint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={item.tipo === 'HABITO' ? 'leaf-outline' : 'medical-outline'} color={item.tipo === 'HABITO' ? colors.purple : colors.primary} size={24} />
      </View><Badge tone={!item.ativo ? 'gray' : item.tipo === 'HABITO' ? 'purple' : 'green'}>{!item.ativo ? 'Arquivado' : item.tipo === 'HABITO' ? 'Hábito' : 'Remédio'}</Badge></View>
      <Text style={ui.heading}>{item.nome}</Text>
      {item.dose && <Text style={ui.muted}>{item.dose}</Text>}
      <View style={ui.divider} />
      <View style={[ui.row, { gap: 8 }]}><Icon name="calendar-outline" size={16} color={colors.muted} /><Text style={[ui.muted, { flex: 1 }]}>{weekLabel(item.diasSemana)}</Text></View>
      <View style={[ui.row, { gap: 8 }]}><Icon name="time-outline" size={16} color={colors.muted} /><Text style={[ui.body, { flex: 1, fontSize: 14, fontWeight: '600' }]}>{item.horarios.map((h) => h.hora).join(' · ')}</Text><Icon name="arrow-forward" size={19} /></View>
    </Pressable>;
  }

  return <Page scroll={false}><FlatList data={items} keyExtractor={(i) => String(i.idItem)} renderItem={renderItem} contentContainerStyle={listContent}
    refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={colors.primary} />}
    ListHeaderComponent={<View style={{ gap: 18, marginBottom: 12 }}>
      <ScreenTitle eyebrow="Sua rotina começa aqui" title="Meus cuidados" subtitle="Remédios e hábitos, organizados do seu jeito." />
      <Button icon="add" onPress={() => router.push('/cadastro')}>Adicionar cuidado</Button>
      <View style={[ui.row, ui.input, { gap: 10 }]}><Icon name="search-outline" size={20} color={colors.muted} />
        <TextInput accessibilityLabel="Buscar cuidado pelo nome" placeholder="Buscar pelo nome" value={search} onChangeText={setSearch}
          placeholderTextColor={colors.muted} style={{ flex: 1, fontSize: 16, color: colors.ink, minHeight: 32 }} /></View>
      <View style={[ui.row, { gap: 8 }]}>{(['TODOS', 'REMEDIO', 'HABITO'] as const).map((type) => <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: filter === type }} onPress={() => setFilter(type)}
        style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: filter === type ? colors.primaryDark : colors.mutedLight }}>
        <Text style={{ color: filter === type ? 'white' : colors.muted, fontSize: 14, fontWeight: '600' }}>{type === 'TODOS' ? 'Todos' : type === 'REMEDIO' ? 'Remédios' : 'Hábitos'}</Text>
      </Pressable>)}</View>
      <View style={ui.between}><Text style={ui.muted}>{items.length} {items.length === 1 ? 'cuidado' : 'cuidados'} {archived ? 'arquivados' : 'ativos'}</Text>
        <Pressable accessibilityRole="button" onPress={() => setArchived(!archived)} style={{ paddingVertical: 12 }}><Text style={ui.link}>{archived ? 'Ver ativos' : 'Ver arquivados'}</Text></Pressable></View>
      <Notice text={error} onRetry={reload} />
    </View>}
    ListEmptyComponent={loading ? <Loading /> : !error ? <Empty icon={archived ? 'archive-outline' : 'heart-outline'} title={search ? 'Não encontramos esse cuidado' : archived ? 'Nenhum cuidado arquivado' : 'Seu primeiro passo de cuidado'}
      text={search ? 'Tente buscar por outro nome ou mudar o filtro.' : archived ? 'Os cuidados desativados vão aparecer aqui, com o histórico preservado.' : 'Adicione seus remédios e hábitos para começar sua rotina.'} /> : null}
  /></Page>;
}
