import { router } from 'expo-router';
import { Button, Empty, Page } from '../components/ui';

export default function NotFound() {
  return <Page><Empty title="Esse caminho não existe" text="Volte à sua rotina para continuar."
    action={<Button onPress={() => router.replace('/')}>Ir para hoje</Button>} /></Page>;
}
