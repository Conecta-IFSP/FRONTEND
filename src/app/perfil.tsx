import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useForm, useWatch } from 'react-hook-form';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { Opcao } from '@/components/Opcao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { ehPreferenciaTema, useTema, type PreferenciaTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { autenticarComDispositivo } from '@/services/autenticacao-local';
import { useSessao } from '@/contexts/SessaoContext';
import { validarNome } from '@/utils/validacao';

type Perfil = { nome: string; email: string; tema?: string };

const OPCOES_TEMA: {
  valor: PreferenciaTema;
  titulo: string;
  icone: IoniconsIconName;
}[] = [
  { valor: 'sistema', titulo: 'Sistema', icone: 'phone-portrait-outline' },
  { valor: 'claro', titulo: 'Claro', icone: 'sunny-outline' },
  { valor: 'escuro', titulo: 'Escuro', icone: 'moon-outline' },
];

export default function TelaPerfil() {
  const router = useRouter();
  const sessao = useSessao();
  const { tema, preferencia, definirPreferencia } = useTema();
  const { cores } = tema;
  const [preferenciaSelecionada, definirPreferenciaSelecionada] = useState<PreferenciaTema>(preferencia);
  const { control, handleSubmit, reset, formState } = useForm<{ nome: string }>({
    defaultValues: { nome: '' },
  });
  const nome = useWatch({ control, name: 'nome' });
  const salvando = formState.isSubmitting;
  const [perfil, definirPerfil] = useState<Perfil | null>(null);
  const [salvandoTema, definirSalvandoTema] = useState(false);
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [abrindo, definirAbrindo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let ativa = true;

      void api<Perfil>('/usuarios/me').then((resultado) => {
        if (!ativa) return;
        definirCarregando(false);
        if (!resultado.ok) {
          definirAviso({ tom: 'erro', titulo: 'Não foi possível carregar', mensagem: resultado.erro });
          return;
        }
        definirPerfil(resultado.dados);
        reset({ nome: resultado.dados.nome });
        if (ehPreferenciaTema(resultado.dados.tema)) {
          definirPreferencia(resultado.dados.tema);
          definirPreferenciaSelecionada(resultado.dados.tema);
        }
      });

      return () => {
        ativa = false;
      };
    }, [definirPreferencia, reset]),
  );

  async function selecionarTema(novaPreferencia: PreferenciaTema) {
    if (salvando || salvandoTema || novaPreferencia === preferenciaSelecionada) return;

    const preferenciaAnterior = preferenciaSelecionada;
    definirPreferenciaSelecionada(novaPreferencia);
    definirPreferencia(novaPreferencia);
    definirSalvandoTema(true);
    definirAviso(null);

    const resultado = await api<Perfil>('/usuarios/me', 'PATCH', { tema: novaPreferencia });

    definirSalvandoTema(false);

    if (!resultado.ok) {
      definirPreferenciaSelecionada(preferenciaAnterior);
      definirPreferencia(preferenciaAnterior);
      definirAviso({ tom: 'erro', titulo: 'Não foi possível alterar o tema', mensagem: resultado.erro });
    }
  }

  async function abrirProtegida(destino: Href) {
    if (abrindo) return;
    definirAbrindo(true);
    const autenticado = await autenticarComDispositivo().catch(() => false);
    definirAbrindo(false);
    if (autenticado) router.push(destino);
  }

  const salvar = handleSubmit(async ({ nome: novoNome }) => {
    definirAviso(null);
    const resultado = await api<Perfil>('/usuarios/me', 'PATCH', { nome: novoNome.trim() });
    if (!resultado.ok) {
      definirAviso({ tom: 'erro', titulo: 'Não foi possível salvar', mensagem: resultado.erro });
      return;
    }
    definirPerfil(resultado.dados);
    reset({ nome: resultado.dados.nome });
    definirAviso({ tom: 'sucesso', mensagem: 'Dados salvos.' });
    void sessao.atualizar();
  });

  const mudouNome = Boolean(perfil && nome.trim() && nome.trim() !== perfil.nome);

  const linhas: { icone: IoniconsIconName; titulo: string; detalhe: string; destino: Href }[] = [
    { icone: 'mail-outline', titulo: 'E-mail', detalhe: perfil?.email ?? '', destino: '/login/trocar-email' },
    { icone: 'key-outline', titulo: 'Senha', detalhe: 'Alterar senha', destino: '/login/alterar-senha' },
  ];

  return (
    <TelaComCabecalho
      titulo="Perfil"
      rodape={
        perfil ? (
          <Botao
            titulo="Salvar"
            tituloCarregando="Salvando..."
            pilula
            carregando={salvando}
            desabilitado={!mudouNome}
            aoTocar={() => void salvar()}
          />
        ) : undefined
      }
    >
      {carregando ? <Carregando rotulo="Carregando perfil" /> : null}

      {perfil ? (
        <View style={styles.identidade}>
          <Avatar nome={nome.trim() || perfil.nome} tamanho={72} />
          <Text style={[styles.nomeTopo, { color: cores.texto }]} numberOfLines={1}>
            {nome.trim() || perfil.nome}
          </Text>
          <Text style={[styles.detalhe, { color: cores.textoSuave }]} numberOfLines={1}>
            {perfil.email}
          </Text>
        </View>
      ) : null}

      {aviso ? <FaixaAviso aviso={aviso} /> : null}

      {perfil ? (
        <>
          <CampoTextoControlado
            controle={control}
            nome="nome"
            validar={validarNome}
            rotulo="Nome"
            placeholder="Nome"
            icone="person-outline"
            autoCapitalize="words"
            editable={!salvando}
            compacto
          />

          <View>
            <Text style={[styles.rotulo, { color: cores.texto }]}>Conta</Text>
            <View style={[styles.lista, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
              {linhas.map((linha, indice) => (
                <Pressable
                  key={linha.titulo}
                  onPress={() => void abrirProtegida(linha.destino)}
                  disabled={abrindo}
                  accessibilityRole="button"
                  accessibilityLabel={linha.titulo}
                  style={({ pressed }) => [
                    styles.linha,
                    indice > 0 ? { borderTopWidth: 1, borderTopColor: cores.bordaSuave } : null,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={[styles.icone, { backgroundColor: cores.primariaSuave }]}>
                    <Ionicons name={linha.icone} size={18} color={cores.primaria} />
                  </View>
                  <View style={styles.textos}>
                    <Text style={[styles.tituloLinha, { color: cores.texto }]}>{linha.titulo}</Text>
                    <Text style={[styles.detalhe, { color: cores.textoSuave }]} numberOfLines={1}>
                      {linha.detalhe}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={cores.textoSutil} />
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={[styles.rotulo, { color: cores.texto }]}>Tema</Text>
            <View style={styles.opcoesTema}>
              {OPCOES_TEMA.map((opcao) => (
                <Opcao
                  key={opcao.valor}
                  titulo={opcao.titulo}
                  icone={opcao.icone}
                  selecionado={preferenciaSelecionada === opcao.valor}
                  aoTocar={() => void selecionarTema(opcao.valor)}
                  desabilitado={salvando || salvandoTema}
                  empilhado
                  style={styles.opcaoTema}
                />
              ))}
            </View>
          </View>
        </>
      ) : null}

      <Pressable
        onPress={() => void sessao.sair()}
        accessibilityRole="button"
        style={({ pressed }) => [styles.sair, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="log-out-outline" size={20} color={cores.erro} />
        <Text style={[styles.textoSair, { color: cores.erro }]}>Sair da conta</Text>
      </Pressable>
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  identidade: { alignItems: 'center', gap: 2, paddingTop: ESPACO.xs },
  nomeTopo: { ...TIPOGRAFIA.subtitulo, marginTop: ESPACO.sm, maxWidth: '100%' },
  detalhe: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  rotulo: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  lista: { borderWidth: 1, borderRadius: RAIO.lg, overflow: 'hidden' },
  linha: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    paddingVertical: ESPACO.sm + 2,
    paddingLeft: ESPACO.md - 2,
    paddingRight: ESPACO.sm + 2,
  },
  icone: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
  tituloLinha: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  opcoesTema: { flexDirection: 'row', gap: ESPACO.sm },
  opcaoTema: { flex: 1 },
  sair: { alignSelf: 'flex-start', height: 44, flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm + 2 },
  textoSair: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
});
