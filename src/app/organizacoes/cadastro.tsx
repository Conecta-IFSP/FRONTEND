import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useForm, useWatch } from 'react-hook-form';

import { coresDoNome, iniciais } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { Etiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import {
  TAMANHO_MAXIMO_DESCRICAO,
  validarCidade,
  validarDescricao,
  validarNomeOrganizacao,
} from '@/utils/validacao';

type DadosOrganizacao = { nome: string; cidade: string; descricao: string };

function Previa({ nome, cidade, descricao, enviada }: DadosOrganizacao & { enviada: boolean }) {
  const { tema } = useTema();
  const { cores } = tema;
  const nomeLimpo = nome.trim();
  const cidadeLimpa = cidade.trim();
  const descricaoLimpa = descricao.trim();
  const tinta = nomeLimpo ? coresDoNome(nomeLimpo, cores) : { fundo: cores.superficieSuave, texto: cores.textoSutil };

  return (
    <View
      style={[styles.previa, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}
      accessibilityLabel={`Prévia: ${nomeLimpo || 'sem nome'}${cidadeLimpa ? `, ${cidadeLimpa}` : ''}`}
    >
      <LinearGradient colors={tema.gradiente} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.faixa} />
      <View style={styles.corpoPrevia}>
        <View style={[styles.sigla, { backgroundColor: tinta.fundo, borderColor: cores.superficie }]}>
          <Text style={[styles.textoSigla, { color: tinta.texto }]}>{nomeLimpo ? iniciais(nomeLimpo) : '?'}</Text>
        </View>
        <Text style={[styles.nomePrevia, { color: nomeLimpo ? cores.texto : cores.textoSutil }]} numberOfLines={1}>
          {nomeLimpo || 'Nome da organização'}
        </Text>
        <View style={styles.linhaCidade}>
          <Ionicons name="location-outline" size={14} color={cidadeLimpa ? cores.textoSuave : cores.textoSutil} />
          <Text style={[styles.detalhe, { color: cidadeLimpa ? cores.textoSuave : cores.textoSutil }]} numberOfLines={1}>
            {cidadeLimpa || 'Cidade'}
          </Text>
        </View>
        {descricaoLimpa ? (
          <Text style={[styles.detalhe, styles.descricaoPrevia, { color: cores.textoSuave }]} numberOfLines={2}>
            {descricaoLimpa}
          </Text>
        ) : null}
        {enviada ? (
          <View style={styles.etiqueta}>
            <Etiqueta texto="Aguardando autorização" tom="alerta" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function TelaCadastroOrganizacao() {
  const router = useRouter();
  const { cores } = useTema().tema;
  const { control, handleSubmit, formState } = useForm<DadosOrganizacao>({
    defaultValues: { nome: '', cidade: '', descricao: '' },
  });
  const [nome, cidade, descricao] = useWatch({ control, name: ['nome', 'cidade', 'descricao'] });
  const carregando = formState.isSubmitting;
  const [erro, definirErro] = useState('');
  const [enviada, definirEnviada] = useState<DadosOrganizacao | null>(null);

  const enviar = handleSubmit(async (dados) => {
    definirErro('');
    const limpos = { nome: dados.nome.trim(), cidade: dados.cidade.trim(), descricao: dados.descricao.trim() };
    const resultado = await api('/organizacoes', 'POST', {
      nome: limpos.nome,
      cidade: limpos.cidade,
      ...(limpos.descricao ? { descricao: limpos.descricao } : {}),
    });

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    definirEnviada(limpos);
  });

  if (enviada) {
    return (
      <TelaComCabecalho
        titulo="Criar organização"
        iconeVoltar="close"
        rotuloVoltar="Fechar"
        rodape={<Botao titulo="Ver organizações" pilula aoTocar={() => router.navigate('/organizacoes')} />}
      >
        <View style={styles.sucesso}>
          <View style={[styles.selo, { backgroundColor: cores.alertaSuave }]}>
            <Ionicons name="time-outline" size={32} color={cores.alerta} />
          </View>
          <Text style={[styles.tituloSucesso, { color: cores.texto }]} accessibilityRole="header">
            Solicitação enviada
          </Text>
          <Text style={[styles.textoSucesso, { color: cores.textoSutil }]}>Aguardando autorização do sistema.</Text>
        </View>
        <Previa {...enviada} enviada />
      </TelaComCabecalho>
    );
  }

  return (
    <TelaComCabecalho
      titulo="Criar organização"
      iconeVoltar="close"
      rodape={
        <Botao
          titulo="Enviar solicitação"
          tituloCarregando="Enviando..."
          pilula
          carregando={carregando}
          aoTocar={() => void enviar()}
        />
      }
    >
      <View style={styles.secao}>
        <Text style={[styles.rotuloPrevia, { color: cores.textoSuave }]}>Prévia</Text>
        <Previa nome={nome} cidade={cidade} descricao={descricao} enviada={false} />
      </View>

      {erro ? <FaixaAviso aviso={{ tom: 'erro', titulo: 'Não foi possível enviar', mensagem: erro }} /> : null}

      <CampoTextoControlado
        controle={control}
        nome="nome"
        validar={validarNomeOrganizacao}
        rotulo="Nome da organização"
        placeholder="Organização"
        icone="business-outline"
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={100}
        editable={!carregando}
        compacto
      />

      <CampoTextoControlado
        controle={control}
        nome="cidade"
        validar={validarCidade}
        rotulo="Cidade"
        placeholder="Cidade"
        icone="location-outline"
        autoCapitalize="words"
        maxLength={60}
        editable={!carregando}
        compacto
      />

      <CampoTextoControlado
        controle={control}
        nome="descricao"
        validar={validarDescricao}
        rotulo="Descrição (opcional)"
        placeholder="Descrição"
        icone="document-text-outline"
        dica={`${descricao.trim().length}/${TAMANHO_MAXIMO_DESCRICAO}`}
        multiline
        maxLength={TAMANHO_MAXIMO_DESCRICAO}
        editable={!carregando}
        compacto
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  secao: { gap: ESPACO.sm },
  rotuloPrevia: { fontFamily: FONTES.titulo, fontSize: 13, lineHeight: 18 },
  previa: { borderWidth: 1, borderRadius: RAIO.lg, overflow: 'hidden' },
  faixa: { height: 52 },
  corpoPrevia: { paddingHorizontal: ESPACO.md - 2, paddingBottom: ESPACO.md - 2, gap: ESPACO.xs },
  sigla: {
    width: 52,
    height: 52,
    marginTop: -26,
    borderWidth: 3,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSigla: { fontFamily: FONTES.titulo, fontSize: 18, lineHeight: 24 },
  nomePrevia: { fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 24, marginTop: ESPACO.xs },
  linhaCidade: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detalhe: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  descricaoPrevia: { marginTop: ESPACO.xs },
  etiqueta: { flexDirection: 'row', marginTop: ESPACO.sm },
  sucesso: { alignItems: 'center', gap: ESPACO.sm, paddingTop: ESPACO.lg },
  selo: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  tituloSucesso: { fontFamily: FONTES.titulo, fontSize: 20, lineHeight: 28, marginTop: ESPACO.xs },
  textoSucesso: { ...TIPOGRAFIA.corpoPequeno, textAlign: 'center', marginBottom: ESPACO.sm },
});
