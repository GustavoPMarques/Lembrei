import { createElement } from 'react';
import { Text, View } from 'react-native';
import { colors, ui } from '../theme';

export interface TimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimeField({ label, value, onChange, disabled = false }: TimeFieldProps) {
  return <View style={{ flex: 1, gap: 6 }}>
    <Text style={[ui.muted, { fontWeight: '600' }]}>{label}</Text>
    {createElement('input', {
      type: 'time', value, disabled, step: 60, lang: 'pt-BR', 'aria-label': label,
      onChange: (event) => onChange(event.currentTarget.value),
      onClick: (event) => {
        try { event.currentTarget.showPicker?.(); } catch {}
      },
      style: { width: '100%', minWidth: 0, minHeight: 68, boxSizing: 'border-box', border: `1px solid ${colors.border}`,
        borderRadius: 16, padding: '12px 16px', fontFamily: 'inherit', fontSize: 24, fontWeight: 700,
        color: colors.primaryDark, backgroundColor: colors.mint, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 },
    })}
  </View>;
}
