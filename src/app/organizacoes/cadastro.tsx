import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useForm, useWatch } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { Cartao } from '@/components/Cartao';
import { Etiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FundoGradiente } from '@/components/FundoGradiente';
import { Logo } from '@/components/Logo';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import {
  TAMANHO_MAXIMO_DESCRICAO,
  validarDescricao,
  validarNomeOrganizacao,
} from '@/utils/validacao';

export default function TelaCadastroOrganizacao() {
  const router = useRouter();
  const { tema } = useTema();
  const { control, handleSubmit, formState } = useForm<{ nome: string; descricao: string }>({
    defaultValues: { nome: '', descricao: '' },
  });
  const descricao = useWatch({ control, name: 'descricao' });
  const carregando = formState.isSubmitting;
  const [erro, definirErro] = useState('');
  const [enviada, definirEnviada] = useState<string | null>(null);

  const enviar = handleSubmit(async ({ nome, descricao: texto }) => {
    definirErro('');
    const descricaoLimpa = texto.trim();
    const resultado = await api('/organizacoes', 'POST', {
      nome: nome.trim(),
      ...(descricaoLimpa ? { descricao: descricaoLimpa } : {}),
    });

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    definirEnviada(nome.trim());
  });

  return (
    <FundoGradiente aoVoltar={() => router.back()}>
      <Logo largura={150} />

      <Cartao style={styles.cartao}>
        {enviada ? (
          <>
            <View style={[styles.iconeSituacao, { backgroundColor: tema.cores.alertaSuave }]}>
              <Ionicons name="time" size={26} color={tema.cores.alerta} />
            </View>
            <Text style={[styles.titulo, styles.tituloEnviado, { color: tema.cores.texto }]}>
              Solicitação enviada
            </Text>
            <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
              A organização {enviada} foi cadastrada e aguarda a autorização de um administrador
              do sistema.
            </Text>
            <View style={styles.etiqueta}>
              <Etiqueta texto="Aguardando autorização" tom="alerta" />
            </View>
            <Botao titulo="Voltar ao início" aoTocar={() => router.back()} style={styles.botao} />
          </>
        ) : (
          <>
            <Text style={[styles.titulo, { color: tema.cores.texto }]}>Criar organização</Text>
            <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
              A organização ficará disponível após a autorização do administrador do sistema.
            </Text>

            {erro ? (
              <View style={styles.aviso}>
                <FaixaAviso
                  aviso={{ tom: 'erro', titulo: 'Não foi possível enviar', mensagem: erro }}
                />
              </View>
            ) : null}

            <View style={styles.campos}>
              <CampoTextoControlado
                controle={control}
                nome="nome"
                validar={validarNomeOrganizacao}
                rotulo="Nome da organização"
                icone="business-outline"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!carregando}
              />

              <CampoTextoControlado
                controle={control}
                nome="descricao"
                validar={validarDescricao}
                rotulo="Descrição (opcional)"
                icone="document-text-outline"
                dica={`${descricao.trim().length}/${TAMANHO_MAXIMO_DESCRICAO}`}
                multiline
                maxLength={TAMANHO_MAXIMO_DESCRICAO}
                editable={!carregando}
              />
            </View>

            <Botao
              titulo="Enviar solicitação"
              tituloCarregando="Enviando..."
              carregando={carregando}
              aoTocar={() => void enviar()}
              style={styles.botao}
            />
          </>
        )}
      </Cartao>
    </FundoGradiente>
  );
}

const styles = StyleSheet.create({
  cartao: { marginTop: ESPACO.lg },
  iconeSituacao: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { ...TIPOGRAFIA.titulo },
  tituloEnviado: { marginTop: ESPACO.md },
  descricao: { ...TIPOGRAFIA.corpoPequeno, marginTop: ESPACO.xs },
  etiqueta: { marginTop: ESPACO.md },
  aviso: { marginTop: ESPACO.lg - 4 },
  campos: { marginTop: ESPACO.lg, gap: ESPACO.md },
  botao: { marginTop: ESPACO.lg },
});
