import { Tabs } from 'expo-router';

import { BarraAbas } from '@/components/BarraAbas';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';

export default function LayoutAbas() {
  const { tema } = useTema();
  const { usuario } = useSessao();

  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <BarraAbas {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tema.cores.fundo } }}
    >
      <Tabs.Screen name="inicio" />
      <Tabs.Protected guard={usuario?.tipo === 'USUARIO'}>
        <Tabs.Screen name="agenda" />
        <Tabs.Screen name="organizacoes" />
        <Tabs.Screen name="organizacao" options={{ href: null }} />
      </Tabs.Protected>
    </Tabs>
  );
}
