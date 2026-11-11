import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Field, Icon, IconButton, Loading, Notice, Page, ScreenTitle } from '../components/ui';
import { ConnectionState } from '../components/ConnectionState';
import { TimeField } from '../components/TimeField';
import { useApp } from '../context/AppContext';
import { useResource } from '../hooks/useResource';
import { itemPayload, type ItemForm } from '../lib/validation';
import { colors, ui } from '../theme';

const blankForm = (): ItemForm => ({ tipo: 'REMEDIO', nome: '', dose: '', quantidade: '1', estoque: '', dias: Array(7).fill(true), horarios: ['08:00'] });

export default function CareFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : undefined;
  const { api, refresh } = useApp();
  const [form, setForm] = useState<ItemForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  const load = useCallback(async (signal: AbortSignal) => {
    const data = await api!.item(id!, signal);
    if (!signal.aborted) setForm({ tipo: data.tipo, nome: data.nome, dose: data.dose || '', quantidade: String(data.qtdPorDose),
      estoque: '', dias: data.diasSemana.split('').map((d) => d === '1'), horarios: data.horarios.map((h) => h.hora) });
    return data;
  }, [api, id]);
  const { data, loading, error } = useResource(load, !!api && !!id);
  function change<K extends keyof ItemForm>(key: K, value: ItemForm[K]) { setForm((f) => ({ ...f, [key]: value })); }

  async function save() {
    if (!api || lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      const payload = itemPayload(form, !!id);
      const item = await api.salvarItem(payload, id);
      refresh();
      if (id && router.canGoBack()) router.back();
      else router.replace(`/item/${item.idItem}`);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Não foi possível salvar esse cuidado.'); }
    finally { lock.current = false; setBusy(false); }
  }

  if (!api) return <ConnectionState />;
  if (params.id && (!Number.isSafeInteger(id) || id! <= 0)) return <Page back title="Editar cuidado"><Notice text="Cuidado inválido. Volte e escolha um cuidado da sua lista." /></Page>;
  return <Page back title={id ? 'Editar cuidado' : 'Novo cuidado'}>
    <ScreenTitle eyebrow="Cabe na sua rotina" title={id ? 'Ajuste seus cuidados.' : 'Um novo cuidado com você.'}
      subtitle="Escolha os dias e os horários. A gente ajuda a lembrar." />
    {loading && id ? <Loading /> : <>
      <Notice text={error} />
      {(!id || data) && <>
        <View style={{ gap: 10 }}><Text style={[ui.body, { fontWeight: '600' }]}>Que tipo de cuidado?</Text>
          <View style={[ui.row, { gap: 12 }]}>{(['REMEDIO', 'HABITO'] as const).map((type) => <Pressable key={type} disabled={!!id || busy}
            accessibilityRole="button" accessibilityState={{ selected: form.tipo === type, disabled: !!id || busy }} onPress={() => change('tipo', type)}
            style={{ flex: 1, borderRadius: 18, padding: 18, borderWidth: 2, borderColor: form.tipo === type ? colors.primary : colors.border,
              backgroundColor: form.tipo === type ? colors.mint : colors.surface, alignItems: 'center', gap: 10 }}>
            <Icon name={type === 'REMEDIO' ? 'medical-outline' : 'leaf-outline'} size={26} />
            <Text style={{ fontSize: 15, color: colors.ink, fontWeight: '600' }}>{type === 'REMEDIO' ? 'Remédio' : 'Hábito'}</Text>
          </Pressable>)}</View>
        </View>
        <View style={ui.card}>
          <Field label={form.tipo === 'REMEDIO' ? 'Nome do remédio' : 'Nome do hábito'} placeholder={form.tipo === 'REMEDIO' ? 'Ex.: Losartana 50 mg' : 'Ex.: Beber água'}
            value={form.nome} onChangeText={(v) => change('nome', v)} maxLength={80} editable={!busy} />
          <Field label={form.tipo === 'REMEDIO' ? 'Descrição da dose (opcional)' : 'Orientação (opcional)'} placeholder={form.tipo === 'REMEDIO' ? 'Ex.: 1 comprimido, após o café' : 'Ex.: Um copo de água'}
            value={form.dose} onChangeText={(v) => change('dose', v)} maxLength={40} editable={!busy} />
          {form.tipo === 'REMEDIO' && <>
            <Field label="Unidades por dose" hint="Quantidade descontada do estoque ao confirmar." value={form.quantidade}
              onChangeText={(v) => change('quantidade', v)} keyboardType="number-pad" inputMode="numeric" maxLength={3} editable={!busy} />
            {!id && <Field label="Quantidade em estoque" hint="Conte quantas unidades você tem agora. Pode ser zero." placeholder="Ex.: 30"
              value={form.estoque} onChangeText={(v) => change('estoque', v)} keyboardType="number-pad" inputMode="numeric" maxLength={5} editable={!busy} />}
          </>}
        </View>
        <View style={ui.card}>
          <Text style={ui.heading}>Em quais dias?</Text><Text style={ui.muted}>Selecione os dias da sua rotina.</Text>
          <View style={[ui.row, { gap: 6, flexWrap: 'wrap' }]}>{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, i) => <Pressable key={day}
            accessibilityRole="checkbox" accessibilityLabel={day} accessibilityState={{ checked: form.dias[i] }} disabled={busy}
            onPress={() => change('dias', form.dias.map((v, j) => i === j ? !v : v))}
            style={{ minWidth: 42, minHeight: 48, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center', borderRadius: 12,
              backgroundColor: form.dias[i] ? colors.primary : colors.mutedLight }}>
            <Text style={{ color: form.dias[i] ? 'white' : colors.muted, fontSize: 13, fontWeight: '700' }}>{day}</Text>
          </Pressable>)}</View>
          <Button variant="ghost" onPress={() => change('dias', Array(7).fill(true))} disabled={busy}>Selecionar todos os dias</Button>
        </View>
        <View style={ui.card}>
          <Text style={ui.heading}>Em quais horários?</Text><Text style={ui.muted}>Toque no horário para escolher as horas e os minutos.</Text>
          {form.horarios.map((hour, i) => <View key={i} style={[ui.row, { gap: 10, alignItems: 'flex-end' }]}>
            <TimeField label={`Horário ${i + 1}`} value={hour} disabled={busy}
              onChange={(value) => change('horarios', form.horarios.map((v, j) => j === i ? value : v))} />
            <IconButton name="close-outline" label={`Remover horário ${i + 1}`} disabled={form.horarios.length === 1 || busy}
              onPress={() => change('horarios', form.horarios.filter((_, j) => j !== i))} />
          </View>)}
          <Button variant="secondary" icon="add" disabled={form.horarios.length >= 24 || busy} onPress={() => change('horarios', [...form.horarios, ''])}>Adicionar outro horário</Button>
        </View>
        {id && <Notice tone="info" text="Horários que já têm registros não podem ser removidos. Para substituir essa agenda, arquive o cuidado e crie outro." />}
        <Notice text={message} />
        <Button icon="checkmark" loading={busy} onPress={() => void save()}>{id ? 'Salvar alterações' : 'Salvar cuidado'}</Button>
        <Text style={[ui.muted, { textAlign: 'center', fontSize: 12 }]}>Os horários seguem o fuso de São Paulo.</Text>
      </>}
    </>}
  </Page>;
}
