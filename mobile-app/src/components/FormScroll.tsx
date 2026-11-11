import { ScrollView, type ScrollViewProps } from 'react-native';

export function FormScroll(props: ScrollViewProps) {
  return <ScrollView {...props} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={[{ flex: 1 }, props.style]} />;
}
