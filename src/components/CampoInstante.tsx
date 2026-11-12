import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Botao } from './Botao';
import { useTema } from '@/contexts/TemaContext';
export function CampoInstante({ rotulo, valor, aoMudar, desabilitado }: {
  rotulo: string; valor: Date; aoMudar: (data: Date) => void; desabilitado?: boolean;
}) {
  const { cores } = useTema().tema;
  const [modo, definirModo] = useState<'date' | 'time' | null>(null);
  function escolher(m: 'date' | 'time') {
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: valor, mode: m, is24Hour: true,
      onChange: (e, data) => { if (e.type === 'set' && data) aoMudar(data); } });
    else definirModo(m);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = `${valor.getFullYear()}-${pad(valor.getMonth() + 1)}-${pad(valor.getDate())}T${pad(valor.getHours())}:${pad(valor.getMinutes())}`;
  return <View style={{ gap: 8 }}>
    <Text style={{ color: cores.texto, fontWeight: 'bold' }}>{rotulo}</Text>
    {Platform.OS === 'web' ? <input aria-label={rotulo} type="datetime-local" value={local} disabled={desabilitado}
      style={{ padding: 12, fontSize: 16, borderRadius: 8, border: `1px solid ${cores.borda}`, backgroundColor: cores.superficie, color: cores.texto }}
      onChange={e => { const data = new Date(e.target.value); if (Number.isFinite(data.getTime())) aoMudar(data); }} /> : <>
      <Botao titulo={valor.toLocaleDateString('pt-BR')} variante="secundario" desabilitado={desabilitado} aoTocar={() => escolher('date')} />
      <Botao titulo={valor.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} variante="secundario" desabilitado={desabilitado} aoTocar={() => escolher('time')} />
      {modo && <><DateTimePicker value={valor} mode={modo} display="spinner" onChange={(_, data) => { if (data) aoMudar(data); }} />
        <Botao titulo="Concluir horário" variante="secundario" aoTocar={() => definirModo(null)} /></>}
    </>}
  </View>;
}
