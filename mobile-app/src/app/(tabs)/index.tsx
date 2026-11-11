import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, ConfirmModal, Empty, Icon, IconButton, listContent, Loading, Notice, Page, ProgressBar, ScreenTitle } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useResource } from '../../hooks/useResource';
import { addDays, formatDay, greeting, localInstant, monday, today } from '../../lib/dates';
import type { Registro } from '../../types/api';
import { colors, ui } from '../../theme';

export default function TodayScreen() {
  const { api, profile, revision, refresh } = useApp();
  const [date, setDate] = useState(today);
  const [now, setNow] = useState(Date.now);
  const [action, setAction] = useState<{ record: Registro; kind: 'confirm' | 'forget' } | null>(null);
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const load = useCallback((signal: AbortSignal) => {
    void revision;
    return api!.all((page) => api!.rotina(date, page, signal));
  }, [api, date, revision]);
  const { data, loading, error, reload } = useResource(load, !!api);
  useEffect(() => {
    let lastDay = today();
    const timer = setInterval(() => {
      const next = Date.now();
      const nextDay = today(new Date(next));
      if (lastDay !== nextDay) {
        const previous = lastDay;
        setDate((d) => d === previous ? nextDay : d);
        lastDay = nextDay;
      }
      setNow(next);
    }, 30000);
    return () => clearInterval(timer);
  }, []);
  const records = data || [];
  const done = records.filter((r) => r.status === 'TOMADO').length;
  const pending = records.filter((r) => r.status !== 'TOMADO').length;
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday(date), i));
  const percent = records.length ? done / records.length * 100 : 0;

  async function perform() {
    if (!api || !action || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setActionError('');
    setMessage('');
    try {
      if (action.kind === 'confirm') await api.confirmar(action.record.idRegistro);
      else await api.esquecer(action.record.idRegistro);
      setMessage(action.kind === 'confirm' ? 'Cuidado confirmado. Seu progresso foi atualizado.' : 'Marcado como esquecido. Você ainda pode confirmar depois.');
      setAction(null);
      refresh();
    } catch (e) {
      setAction(null);
      setActionError(e instanceof Error ? e.message : 'Não foi possível registrar esse cuidado.');
      reload();
    } finally { actionLock.current = false; setBusy(false); }
  }

  function recordCard({ item }: { item: Registro }) {
    const completed = item.status === 'TOMADO';
    const due = localInstant(item.dtPrevista) <= now;
    const forgotten = item.status === 'ESQUECIDO';
    return <View style={[ui.card, completed && { backgroundColor: '#F1F6EF', borderColor: '#DFE8DA' }]}>
      <View style={ui.between}>
        <View style={[ui.row, { gap: 10 }]}><Icon name="time-outline" color={colors.muted} size={18} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{item.dtPrevista.slice(11, 16)}</Text></View>
        <Badge tone={completed ? 'green' : forgotten ? 'gray' : due ? 'amber' : 'gray'}>
          {completed ? 'Concluído' : forgotten ? 'Esquecido' : due ? 'Pode confirmar' : 'Mais tarde'}
        </Badge>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ver detalhes de ${item.nome}`} onPress={() => router.push(`/item/${item.idItem}`)} style={[ui.row, { gap: 14, paddingVertical: 6 }]}>
        <View style={[styles.typeIcon, { backgroundColor: item.tipo === 'HABITO' ? colors.purpleLight : colors.mint }]}>
          <Icon name={item.tipo === 'HABITO' ? 'leaf-outline' : 'medical-outline'} color={item.tipo === 'HABITO' ? colors.purple : colors.primary} size={25} />
        </View>
        <View style={{ flex: 1, gap: 4 }}><Text style={ui.heading}>{item.nome}</Text>
          <Text style={ui.muted}>{item.tipo === 'HABITO' ? 'Um momento para você' : item.dose || `${item.qtdPorDose} unidade(s) por dose`}</Text></View>
        <Icon name={completed ? 'checkmark-circle' : 'chevron-forward'} color={completed ? colors.primary : '#91A18F'} size={completed ? 28 : 18} />
      </Pressable>
      {!completed && <View style={[ui.row, { gap: 8 }]}>
        <Button icon="checkmark" style={{ flex: 1 }} variant={due ? 'primary' : 'secondary'} disabled={!due || busy}
          onPress={() => setAction({ record: item, kind: 'confirm' })}>{due ? item.tipo === 'REMEDIO' ? 'Já tomei' : 'Já fiz' : `Às ${item.dtPrevista.slice(11, 16)}`}</Button>
        {due && !forgotten && <Button variant="ghost" disabled={busy} onPress={() => setAction({ record: item, kind: 'forget' })}>Esqueci</Button>}
      </View>}
    </View>;
  }

  return <Page scroll={false}>
    <FlatList data={records} keyExtractor={(r) => String(r.idRegistro)} renderItem={recordCard}
      contentContainerStyle={listContent} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} tintColor={colors.primary} />}
      ListHeaderComponent={<View style={{ gap: 22, marginBottom: 10 }}>
        <ScreenTitle eyebrow={`${greeting()}${profile?.nome && profile.nome !== 'Você' ? `, ${profile.nome.split(' ')[0]}` : ''}`} title="Um cuidado de cada vez."
          subtitle="Sua rotina mais leve. Estamos aqui para lembrar." />
        <View style={styles.hero}>
          <View style={{ flex: 1, gap: 12 }}><Text style={styles.heroLabel}>{date === today() ? 'SEU DIA, NO SEU RITMO' : formatDay(date, { weekday: 'long' }).toUpperCase()}</Text>
            <Text style={styles.heroTitle}>{records.length === 0 ? 'Vamos cuidar de você?' : done === records.length ? 'Você cuidou de tudo!' : `${done} de ${records.length} cuidados feitos`}</Text>
            <Text style={styles.heroText}>{records.length === 0 ? 'Adicione seu primeiro remédio ou hábito.' : pending === 1 ? 'Falta um cuidado para completar o dia.' : `${pending} cuidados para completar o dia.`}</Text>
            <ProgressBar percent={percent} color="#B4DE9D" />
          </View>
          <View style={styles.heroOrb}><Icon name={done > 0 && done === records.length ? 'checkmark' : 'sunny-outline'} color="#E9F4C6" size={42} /></View>
        </View>
        <View style={{ gap: 12 }}>
          <View style={ui.between}>
            <Text style={ui.heading}>{formatDay(date, { month: 'long', year: 'numeric', day: undefined })}</Text>
            <View style={[ui.row, { gap: 8 }]}><IconButton name="chevron-back" label="Semana anterior" onPress={() => setDate(addDays(date, -7))} />
              <IconButton name="chevron-forward" label="Próxima semana" onPress={() => setDate(addDays(date, 7))} /></View>
          </View>
          <View style={[ui.row, { gap: 5 }]}>{days.map((day, i) => <Pressable key={day} accessibilityRole="button"
            accessibilityLabel={formatDay(day, { weekday: 'long' })} accessibilityState={{ selected: day === date }} onPress={() => { setDate(day); setMessage(''); setActionError(''); }}
            style={[styles.day, day === date && { backgroundColor: colors.primary }]}>
            <Text style={[styles.dayLabel, day === date && { color: '#DBEFE3' }]}>{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}</Text>
            <Text style={[styles.dayNumber, day === date && { color: '#FFFFFF' }]}>{Number(day.slice(8))}</Text>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: day === today() ? day === date ? 'white' : colors.primary : 'transparent' }} />
          </Pressable>)}</View>
        </View>
        <View style={ui.between}><Text style={ui.heading}>Seus lembretes</Text>
          {date !== today() ? <Button variant="ghost" onPress={() => setDate(today())}>Ir para hoje</Button>
            : <Pressable accessibilityRole="button" onPress={() => router.push('/cadastro')} style={{ padding: 12 }}><Text style={ui.link}>+ Novo cuidado</Text></Pressable>}
        </View>
        <Notice text={actionError || error} onRetry={reload} />
        <Notice text={message} tone="success" />
      </View>}
      ListEmptyComponent={loading ? <Loading /> : !error ? <Empty icon="sunny-outline" title="Um espaço para seus cuidados"
        text="Cadastre um remédio ou um hábito e encontre os horários por aqui."
        action={<Button icon="add" onPress={() => router.push('/cadastro')}>Adicionar cuidado</Button>} /> : null}
      ListFooterComponent={<Text style={[ui.muted, { textAlign: 'center', marginTop: 18, fontSize: 12 }]}>Cada pequeno cuidado conta. ♡</Text>}
    />
    <ConfirmModal visible={!!action} title={action?.kind === 'confirm' ? 'Confirmar esse cuidado?' : 'Marcar como esquecido?'}
      text={action?.kind === 'confirm' ? `${action.record.nome}. Confirme apenas se você já realizou esse cuidado.` : `${action?.record.nome || ''}. Se realizar depois, você ainda poderá confirmar.`}
      confirmLabel={action?.kind === 'confirm' ? 'Sim, confirmar' : 'Marcar como esquecido'} busy={busy} onConfirm={() => void perform()} onClose={() => setAction(null)} />
  </Page>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primaryDark, borderRadius: 25, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16, overflow: 'hidden' },
  heroLabel: { color: '#C1DFC9', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  heroTitle: { color: 'white', fontSize: 24, lineHeight: 31, letterSpacing: -0.6, fontWeight: '700' },
  heroText: { color: '#CCE3D6', fontSize: 14, lineHeight: 21 },
  heroOrb: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#286B52', borderWidth: 1, borderColor: '#498269', justifyContent: 'center', alignItems: 'center' },
  day: { flex: 1, borderRadius: 17, paddingVertical: 12, gap: 6, alignItems: 'center', backgroundColor: '#EFF2E9', minHeight: 80 },
  dayLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  dayNumber: { fontSize: 19, fontWeight: '700', color: colors.ink },
  typeIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
