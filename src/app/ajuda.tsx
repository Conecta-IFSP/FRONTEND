import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Sanfona } from '@/components/Sanfona';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { SELO_PERFIL, TOPICOS_AJUDA, URL_MANUAL_PDF } from '@/constants/ajuda';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { filtrarTopicosAjuda } from '@/utils/busca-ajuda';
import { plural } from '@/utils/reunioes';

function primeiraPerguntaDo(topicoId: string | undefined) {
  return TOPICOS_AJUDA.find((topico) => topico.id === topicoId)?.perguntas[0]?.id;
}

export default function TelaAjuda() {
  const router = useRouter();
  const { usuario } = useSessao();
  const { cores } = useTema().tema;
  const { topico } = useLocalSearchParams<{ topico?: string }>();

  const rolagem = useRef<KeyboardAwareScrollViewRef>(null);
  const posicoes = useRef<Record<string, number>>({});
  const rolouPara = useRef<string | null>(null);
  const [abertas, definirAbertas] = useState<ReadonlySet<string>>(() => {
    const inicial = primeiraPerguntaDo(topico);
    return new Set(inicial ? [inicial] : []);
  });
  const [busca, definirBusca] = useState('');
  const buscando = busca.trim().length > 0;
  const topicosVisiveis = useMemo(() => filtrarTopicosAjuda(TOPICOS_AJUDA, busca), [busca]);
  const encontradas = topicosVisiveis.reduce((total, item) => total + item.perguntas.length, 0);

  const rolarParaTopico = useCallback(() => {
    if (!topico || rolouPara.current === topico) return;
    const y = posicoes.current[topico];
    if (y === undefined) return;
    rolouPara.current = topico;
    rolagem.current?.scrollTo({ y: Math.max(0, y - ESPACO.sm), animated: true });
  }, [topico]);

  // Também atende uma troca de parâmetro com a tela já aberta.
  useEffect(() => {
    const inicial = primeiraPerguntaDo(topico);
    if (!inicial) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    definirAbertas((atuais) => (atuais.has(inicial) ? atuais : new Set(atuais).add(inicial)));
    rolarParaTopico();
  }, [topico, rolarParaTopico]);

  function alternar(perguntaId: string, aberta: boolean) {
    definirAbertas((atuais) => {
      const proximas = new Set(atuais);
      if (aberta) proximas.add(perguntaId);
      else proximas.delete(perguntaId);
      return proximas;
    });
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace(usuario ? '/inicio' : '/login');
  }

  return (
    <TelaComCabecalho titulo="Ajuda" aoVoltar={voltar} refRolagem={rolagem}>
      <Text style={[styles.introducao, { color: cores.textoSuave }]}>
        Toque em uma pergunta para ver a resposta. As marcadas com Responsável tratam de ações exclusivas do
        responsável pela comissão.
      </Text>

      <CampoTexto
        rotulo="Buscar"
        placeholder="Ex.: ata, votação, senha"
        icone="search-outline"
        value={busca}
        onChangeText={definirBusca}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        compacto
        acaoFinal={
          busca ? { icone: 'close-circle', rotuloAcessivel: 'Limpar busca', aoTocar: () => definirBusca('') } : undefined
        }
      />

      {buscando ? (
        <Text style={[styles.introducao, { color: cores.textoSuave }]} accessibilityLiveRegion="polite">
          {encontradas > 0
            ? plural(encontradas, 'pergunta encontrada', 'perguntas encontradas')
            : 'Nenhuma pergunta encontrada.'}
        </Text>
      ) : null}

      {buscando && encontradas === 0 ? (
        <EstadoVazio
          icone="search-outline"
          mensagem="Tente outra palavra, como o nome da tela ou do botão. Se não encontrar, consulte o manual completo."
        />
      ) : null}

      {topicosVisiveis.map((item) => (
        <View
          key={item.id}
          onLayout={(evento) => {
            posicoes.current[item.id] = evento.nativeEvent.layout.y;
            if (item.id === topico) rolarParaTopico();
          }}
        >
          <View style={styles.cabecalhoTopico}>
            {item.icone ? (
              <View style={[styles.iconeTopico, { backgroundColor: cores.primariaSuave }]}>
                <Ionicons name={item.icone} size={16} color={cores.primaria} />
              </View>
            ) : null}
            <Text style={[styles.tituloTopico, { color: cores.texto }]} accessibilityRole="header">
              {item.titulo}
            </Text>
          </View>
          <View style={[styles.lista, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
            {item.perguntas.map((pergunta, indice) => (
              <Sanfona
                key={pergunta.id}
                pergunta={pergunta.pergunta}
                resposta={pergunta.resposta}
                selo={SELO_PERFIL[pergunta.perfil]}
                aberta={abertas.has(pergunta.id)}
                aoAlternar={(aberta) => alternar(pergunta.id, aberta)}
                primeira={indice === 0}
              />
            ))}
          </View>
        </View>
      ))}

      {URL_MANUAL_PDF ? (
        <Botao
          titulo="Ver manual completo (PDF)"
          icone="document-outline"
          variante="secundario"
          pilula
          aoTocar={() => void Linking.openURL(URL_MANUAL_PDF).catch(() => {})}
        />
      ) : null}
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  introducao: { ...TIPOGRAFIA.corpoPequeno },
  cabecalhoTopico: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm, marginBottom: ESPACO.sm },
  iconeTopico: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tituloTopico: { fontFamily: FONTES.titulo, fontSize: 15, lineHeight: 22, flex: 1 },
  lista: { borderWidth: 1, borderRadius: RAIO.lg, overflow: 'hidden' },
});
