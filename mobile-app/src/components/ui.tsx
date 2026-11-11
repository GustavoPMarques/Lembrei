import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View, type ColorValue, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, ui } from '../theme';
import { FormScroll } from './FormScroll';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, color = colors.primary, size = 22 }: { name: IconName; color?: ColorValue; size?: number }) {
  return <Ionicons name={name} color={color} size={size} accessible={false} aria-hidden={true} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

export function Brand() {
  return <View style={[ui.row, { gap: 10 }]}>
    <View style={styles.brandMark}><Icon name="checkmark" color="white" size={23} /></View>
    <Text style={styles.brand}>Lembrei<Text style={{ color: colors.primary }}>!</Text></Text>
  </View>;
}

export function IconButton({ name, label, onPress, disabled = false }: { name: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.mint }, disabled && { opacity: 0.4 }]}>
    <Icon name={name} color={colors.ink} />
  </Pressable>;
}

export function Button({ children, onPress, icon, variant = 'primary', loading = false, disabled = false, style }: {
  children: ReactNode; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  const foreground = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? colors.red : colors.primaryDark;
  return <Pressable accessibilityRole="button" accessibilityLabel={typeof children === 'string' ? children : undefined} accessibilityState={{ disabled: disabled || loading, busy: loading }}
    disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button,
      variant === 'primary' ? { backgroundColor: colors.primary } : variant === 'secondary'
        ? { backgroundColor: colors.mint } : variant === 'danger' ? { backgroundColor: colors.redLight } : {},
      (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style]}>
    {loading ? <ActivityIndicator color={foreground} /> : icon ? <Icon name={icon} color={foreground} size={20} /> : null}
    <Text style={{ color: foreground, fontSize: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 }}>{children}</Text>
  </Pressable>;
}

export function Page({ children, scroll = true, back = false, title, refreshing: _refreshing }: {
  children: ReactNode; scroll?: boolean; back?: boolean; title?: string; refreshing?: boolean;
}) {
  return <SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
    <View style={styles.topbar}>
      {back ? <View style={[ui.row, { gap: 10, flex: 1 }]}>
        <IconButton name="arrow-back" label="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
        <Text style={ui.heading}>{title}</Text>
      </View> : <Brand />}
      {!back && <IconButton name="settings-outline" label="Abrir ajustes" onPress={() => router.push('/ajustes')} />}
    </View>
    <View style={{ flex: 1 }}>
      {scroll ? <FormScroll contentContainerStyle={styles.content}>
        {children}
      </FormScroll> : children}
    </View>
  </SafeAreaView>;
}

export const listContent = { padding: 22, paddingBottom: 36, gap: 12, width: '100%' as const, maxWidth: 1040, alignSelf: 'center' as const };

export function ScreenTitle({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return <View style={{ gap: 8, marginBottom: 12 }}>
    {eyebrow && <Text style={ui.label}>{eyebrow.toLocaleUpperCase('pt-BR')}</Text>}
    <View style={[ui.between, { alignItems: 'flex-start' }]}><Text style={[ui.title, { flex: 1 }]}>{title}</Text>{action}</View>
    {subtitle && <Text style={ui.muted}>{subtitle}</Text>}
  </View>;
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return <View style={{ gap: 7 }}>
    <Text style={[ui.body, { fontWeight: '600' }]}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor="#839185" {...props} style={[ui.input, props.style]} />
    {hint && <Text style={ui.muted}>{hint}</Text>}
  </View>;
}

export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'amber' | 'purple' | 'gray' }) {
  const background = { green: colors.mint, amber: colors.amberLight, purple: colors.purpleLight, gray: colors.mutedLight }[tone];
  const color = { green: colors.primaryDark, amber: colors.amber, purple: colors.purple, gray: colors.muted }[tone];
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: background }}>
    <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{children}</Text>
  </View>;
}

export function Notice({ text, tone = 'error', onRetry }: { text: string; tone?: 'error' | 'success' | 'info'; onRetry?: () => void }) {
  if (!text) return null;
  return <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.notice,
    { backgroundColor: tone === 'error' ? colors.redLight : colors.mint }]}>
    <Icon name={tone === 'success' ? 'checkmark-circle-outline' : 'information-circle-outline'} color={tone === 'error' ? colors.red : colors.primary} />
    <View style={{ flex: 1, gap: 8 }}><Text style={[ui.muted, { color: tone === 'error' ? colors.red : colors.primaryDark }]}>{text}</Text>
      {onRetry && <Pressable accessibilityRole="button" onPress={onRetry} style={{ paddingVertical: 10 }}><Text style={ui.link}>Tentar novamente</Text></Pressable>}
    </View>
  </View>;
}

export function Loading({ text = 'Preparando seus cuidados…' }: { text?: string }) {
  return <View style={{ padding: 42, alignItems: 'center', gap: 14 }}><ActivityIndicator color={colors.primary} size="large" /><Text style={ui.muted}>{text}</Text></View>;
}

export function Empty({ icon = 'leaf-outline', title, text, action }: { icon?: IconName; title: string; text: string; action?: ReactNode }) {
  return <View style={[ui.card, { alignItems: 'center', paddingVertical: 36, gap: 16 }]}>
    <View style={styles.emptyIcon}><Icon name={icon} size={30} /></View>
    <Text style={[ui.heading, { textAlign: 'center' }]}>{title}</Text>
    <Text style={[ui.muted, { textAlign: 'center', maxWidth: 340 }]}>{text}</Text>
    {action}
  </View>;
}

export function ProgressBar({ percent, color = colors.primary }: { percent: number; color?: string }) {
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }} style={styles.track}>
    <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, percent))}%`, borderRadius: 20, backgroundColor: color }} />
  </View>;
}

export function ConfirmModal({ visible, title, text, confirmLabel = 'Confirmar', danger = false, busy, onConfirm, onClose }: {
  visible: boolean; title: string; text: string; confirmLabel?: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <View style={styles.overlay}><View accessibilityViewIsModal style={[ui.card, { width: '100%', maxWidth: 420, gap: 20 }]}>
      <Text style={ui.heading}>{title}</Text><Text style={ui.body}>{text}</Text>
      <Button variant={danger ? 'danger' : 'primary'} onPress={onConfirm} loading={busy}>{confirmLabel}</Button>
      <Button variant="ghost" onPress={onClose} disabled={busy}>Cancelar</Button>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  topbar: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  content: { width: '100%', maxWidth: 1040, alignSelf: 'center', padding: 22, paddingBottom: 48, gap: 22 },
  brand: { fontSize: 26, fontWeight: '800', letterSpacing: -1.1, color: colors.ink },
  brandMark: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  iconButton: { minWidth: 46, minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  button: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  notice: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  emptyIcon: { width: 68, height: 68, backgroundColor: colors.mint, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, width: '100%', backgroundColor: '#E7ECE4', overflow: 'hidden', borderRadius: 20 },
  overlay: { flex: 1, backgroundColor: '#0E251DB0', padding: 24, alignItems: 'center', justifyContent: 'center' },
});
