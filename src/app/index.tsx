import { Redirect } from 'expo-router';
import { useSessao } from '@/contexts/SessaoContext';

export default function Raiz() {
  const { usuario } = useSessao();
  return <Redirect href={usuario ? '/inicio' : '/login'} />;
}
