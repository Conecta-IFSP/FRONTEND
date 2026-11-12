import { useCallback, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { api } from '@/services/api';
import { useTema } from '@/contexts/TemaContext';
import { useSessao } from '@/contexts/SessaoContext';

export function SinoNotificacoes() {
  const { usuario } = useSessao();
  const usuarioId = usuario?._id;
  const tipoUsuario = usuario?.tipo;
  const { cores } = useTema().tema;
  const router = useRouter();
  const [total, definirTotal] = useState(0);
  useFocusEffect(useCallback(() => {
    let ativa = true;
    const buscar = async () => {
      if (!usuarioId || tipoUsuario !== 'USUARIO') return;
      const r = await api<{ nao_lidas: number }>('/notificacoes');
      if (ativa && r.ok) definirTotal(r.dados.nao_lidas);
    };
    void buscar();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void buscar(); }, 30000);
    return () => { ativa = false; clearInterval(timer); };
  }, [usuarioId, tipoUsuario]));
  if (usuario?.tipo !== 'USUARIO') return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Notificações, ${total} não lidas`}
    onPress={() => router.push('/notificacoes')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="notifications-outline" size={24} color={cores.texto} />
    {total > 0 && <View style={{ position: 'absolute', right: 0, top: 0, backgroundColor: cores.erro, borderRadius: 12, paddingHorizontal: 4, minWidth: 18, alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 10 }}>{total > 99 ? '99+' : total}</Text>
    </View>}
  </Pressable>;
}
