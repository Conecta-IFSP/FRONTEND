import { useCallback, useRef, useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Botao } from '@/components/Botao';
import { CabecalhoAba } from '@/components/CabecalhoAba';
import { Carregando } from '@/components/Carregando';
import { ControleSegmentado } from '@/components/ControleSegmentado';
import { EstadoVazio } from '@/components/EstadoVazio';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { useSessao } from '@/contexts/SessaoContext';
import { api } from '@/services/api';
import { exportarRelatorioIndividual } from '@/services/exportar-relatorio-individual';
import type { RelatorioIndividual } from '@/types/relatorio-individual';
import { consultaRelatorio, dataRelatorio, horasRelatorio, periodoRelatorio, type PeriodoRelatorio } from '@/utils/relatorio-individual';

const PERIODOS = [{ valor: 'todos', titulo: 'Todo período' }, { valor: 'mes', titulo: 'Este mês' }, { valor: 'ano', titulo: 'Este ano' }] as const;

export default function TelaRelatorioIndividual() {
  const { cores } = useTema().tema;
  const { usuario } = useSessao();
  const [periodo, definirPeriodo] = useState<PeriodoRelatorio>('todos');
  const [relatorio, definirRelatorio] = useState<RelatorioIndividual | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');
  const [erroExportacao, definirErroExportacao] = useState('');
  const [exportando, definirExportando] = useState<'pdf' | 'csv' | null>(null);
  const pedido = useRef(0);
  const travaExportacao = useRef(false);
  const carregar = useCallback(async () => {
    const numero = ++pedido.current;
    definirCarregando(true); definirErro(''); definirErroExportacao(''); definirRelatorio(null);
    if (!usuario?._id) { definirCarregando(false); return; }
    const resultado = await api<RelatorioIndividual>(`/relatorios/individual${consultaRelatorio(periodo)}`);
    if (numero !== pedido.current) return;
    definirCarregando(false);
    if (resultado.ok) definirRelatorio(resultado.dados); else definirErro(resultado.erro);
  }, [periodo, usuario?._id]);
  useFocusEffect(useCallback(() => {
    void carregar();
    return () => { pedido.current++; };
  }, [carregar]));

  async function exportar(formato: 'pdf' | 'csv') {
    if (!relatorio || travaExportacao.current) return;
    travaExportacao.current = true; definirExportando(formato); definirErroExportacao('');
    try { await exportarRelatorioIndividual(relatorio, formato); }
    catch (e) { definirErroExportacao(e instanceof Error ? e.message : 'Não foi possível exportar. Tente novamente.'); }
    finally { travaExportacao.current = false; definirExportando(null); }
  }

  return <SafeAreaView edges={['top']} style={[styles.tela, { backgroundColor: cores.fundo }]}>
    <CabecalhoAba titulo="Relatório individual" />
    <FlatList
      data={relatorio?.reunioes ?? []}
      keyExtractor={item => item.reuniao_id}
      contentContainerStyle={styles.conteudo}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} tintColor={cores.primaria} />}
      ListHeaderComponent={<View style={styles.cabecalho}>
        <Text style={[styles.corpo, { color: cores.textoSuave }]}>Consulte as reuniões em que sua presença foi confirmada.</Text>
        <ControleSegmentado opcoes={PERIODOS} valor={periodo} aoMudar={definirPeriodo} rotuloAcessivel="Período do relatório" desabilitado={Boolean(exportando)} />
        <Botao titulo="Atualizar relatório" variante="secundario" desabilitado={carregando || Boolean(exportando)} aoTocar={() => void carregar()} />
        {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
        {erroExportacao ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erroExportacao }} /> : null}
        {relatorio && <>
          <Text style={[styles.titulo, { color: cores.texto }]}>{relatorio.usuario.nome}</Text>
          <Text style={[styles.corpo, { color: cores.textoSuave }]}>{periodoRelatorio(relatorio)} · pela data de início da reunião</Text>
          <View style={[styles.resumo, { backgroundColor: cores.primariaSuave }]}>
            <Text style={[styles.titulo, { color: cores.primaria }]}>{relatorio.resumo.reunioes} reunião(ões)</Text>
            <Text style={[styles.corpo, { color: cores.texto }]}>{horasRelatorio(relatorio.resumo.minutos_registrados)} de participação registrada</Text>
            {relatorio.resumo.registros_sem_duracao > 0 && <Text style={[styles.corpo, { color: cores.textoSuave }]}>{relatorio.resumo.registros_sem_duracao} registro(s) sem duração calculada. É necessário ter entrada e saída válidas.</Text>}
          </View>
          <View style={styles.exportacoes}>
            <Botao titulo="Exportar PDF" icone="document-text-outline" carregando={exportando === 'pdf'} desabilitado={Boolean(exportando) || !relatorio.reunioes.length} aoTocar={() => void exportar('pdf')} />
            <Botao titulo="Exportar CSV" icone="download-outline" variante="secundario" carregando={exportando === 'csv'} desabilitado={Boolean(exportando) || !relatorio.reunioes.length} aoTocar={() => void exportar('csv')} />
          </View>
          {Platform.OS === 'web' && <Text style={[styles.legenda, { color: cores.textoSuave }]}>Para PDF, escolha “Salvar como PDF” na janela de impressão.</Text>}
          <Text style={[styles.legenda, { color: cores.textoSuave }]}>Atualizado em {dataRelatorio(relatorio.gerada_em)}. Reuniões canceladas e presenças pendentes ou recusadas não entram no relatório.</Text>
        </>}
      </View>}
      ListEmptyComponent={carregando ? <Carregando rotulo="Buscando suas participações" /> : !erro ? <EstadoVazio icone="document-text-outline" mensagem="Nenhuma participação confirmada neste período." /> : undefined}
      renderItem={({ item }) => <View style={[styles.registro, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
        <Text style={[styles.titulo, { color: cores.texto }]}>{item.titulo}</Text>
        <Text style={[styles.corpo, { color: cores.textoSuave }]}>{item.organizacao} · {item.comissao}</Text>
        <Text style={[styles.corpo, { color: cores.texto }]}>Início: {dataRelatorio(item.inicio)}{item.dia_inteiro ? ' · Dia inteiro' : ''}</Text>
        <Text style={[styles.corpo, { color: cores.texto }]}>Término: {dataRelatorio(item.fim)}</Text>
        <Text style={[styles.corpo, { color: cores.textoSuave }]}>{item.local || 'Local não informado'}</Text>
        <Text style={[styles.corpo, { color: cores.texto }]}>Entrada: {dataRelatorio(item.entrada)}</Text>
        <Text style={[styles.corpo, { color: cores.texto }]}>Saída: {dataRelatorio(item.saida)}</Text>
        <Text style={[styles.duracao, { color: cores.primaria }]}>{item.minutos === null ? 'Duração não calculada' : horasRelatorio(item.minutos)}</Text>
      </View>}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 16, paddingBottom: 32 },
  cabecalho: { gap: 12, marginBottom: 16 },
  corpo: { ...TIPOGRAFIA.corpoPequeno },
  titulo: { ...TIPOGRAFIA.subtitulo },
  legenda: { ...TIPOGRAFIA.legenda },
  resumo: { padding: 16, borderRadius: 16, gap: 6 },
  exportacoes: { gap: 8 },
  registro: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6, marginBottom: 12 },
  duracao: { fontFamily: FONTES.titulo, fontSize: 16, marginTop: 4 },
});
