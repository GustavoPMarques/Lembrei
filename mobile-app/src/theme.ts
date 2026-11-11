import { StyleSheet } from 'react-native';

export const colors = {
  background: '#F7F8F4', surface: '#FFFFFF', ink: '#20382F', muted: '#69776E',
  primary: '#147D64', primaryDark: '#0D5A48', mint: '#E8F3EC', border: '#E3E8DF',
  amber: '#98621A', amberLight: '#FFF3DB', red: '#AB4545', redLight: '#FBEDED',
  purple: '#7865AA', purpleLight: '#F0EDF8', mutedLight: '#EFF1EB',
};

export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  grow: { flex: 1 },
  gap: { gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 12 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '800', color: colors.ink, letterSpacing: -0.9 },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink },
  muted: { fontSize: 14, lineHeight: 21, color: colors.muted },
  label: { fontSize: 13, lineHeight: 19, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: colors.border },
  input: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: '#C9D3C8', paddingHorizontal: 16,
    paddingVertical: 12, fontSize: 16, color: colors.ink, backgroundColor: colors.surface },
  link: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});
