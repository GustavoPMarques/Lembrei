import { type ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

export function FormScroll(props: ScrollViewProps) {
  return <KeyboardAwareScrollView {...props} bottomOffset={28} extraKeyboardSpace={20}
    keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
    style={[{ flex: 1 }, props.style]} />;
}
