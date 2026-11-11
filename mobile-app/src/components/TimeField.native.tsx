import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, Text, View } from 'react-native';
import { colors, ui } from '../theme';
import { Button, Icon } from './ui';
import type { TimeFieldProps } from './TimeField';

function pickerDate(value: string) {
  const [hours, minutes] = /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value.split(':').map(Number) : [8, 0];
  return new Date(2000, 0, 1, hours, minutes, 0);
}

function pickerValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function TimeField({ label, value, onChange, disabled = false }: TimeFieldProps) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(() => pickerDate(value));

  function open() {
    Keyboard.dismiss();
    const initial = pickerDate(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial, mode: 'time', display: 'clock', is24Hour: true,
        positiveButton: { label: 'Confirmar', textColor: colors.primary },
        negativeButton: { label: 'Cancelar', textColor: colors.muted },
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) onChange(pickerValue(selected));
        },
      });
    } else {
      setDraft(initial);
      setVisible(true);
    }
  }

  return <View style={{ flex: 1, gap: 6 }}>
    <Text style={[ui.muted, { fontWeight: '600' }]}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'não escolhido'}. Alterar horário`}
      accessibilityHint="Abre o seletor de horas e minutos" accessibilityState={{ disabled }} disabled={disabled} onPress={open}
      style={({ pressed }) => [{ minHeight: 72, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16,
        borderWidth: 1, borderColor: colors.border, backgroundColor: colors.mint,
        flexDirection: 'row', alignItems: 'center', gap: 12 }, disabled && { opacity: 0.5 }, pressed && { borderColor: colors.primary }]}>
      <Icon name="time-outline" size={25} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.primaryDark, fontSize: value ? 26 : 19, fontWeight: '700' }}>{value || 'Escolher horário'}</Text>
        <Text style={{ color: colors.primaryDark, fontSize: 12 }}>Toque para {value ? 'alterar' : 'escolher'}</Text>
      </View>
      <Icon name="chevron-down" size={20} />
    </Pressable>
    {Platform.OS === 'ios' && <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, backgroundColor: '#0E251DB0', padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <View accessibilityViewIsModal style={[ui.card, { width: '100%', maxWidth: 420, gap: 18 }]}>
          <Text style={ui.heading}>Escolha o horário</Text>
          <Text style={ui.muted}>Role as horas e os minutos. Depois, confirme.</Text>
          <DateTimePicker value={draft} mode="time" display="spinner" locale="pt-BR" is24Hour themeVariant="light"
            textColor={colors.ink} accentColor={colors.primary} onChange={(_, selected) => { if (selected) setDraft(selected); }} />
          <Button onPress={() => { onChange(pickerValue(draft)); setVisible(false); }}>Confirmar horário</Button>
          <Button variant="ghost" onPress={() => setVisible(false)}>Cancelar</Button>
        </View>
      </View>
    </Modal>}
  </View>;
}
