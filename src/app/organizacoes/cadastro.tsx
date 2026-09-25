/** Tela de cadastro de organização: a solicitação nasce pendente de autorização. */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
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
  const [nome, definirNome] = useState('');
  const [descricao, definirDescricao] = useState('');
  const [erros, definirErros] = useState<{ nome: string | null; descricao: string | null }>({
    nome: null,
    descricao: null,
  });
  const [erro, definirErro] = useState('');
  const [enviada, definirEnviada] = useState(false);
  const [carregando, definirCarregando] = useState(false);

  async function enviar() {
    const encontrados = {
      nome: validarNomeOrganizacao(nome),
      descricao: validarDescricao(descricao),
    };
    definirErros(encontrados);
    definirErro('');
    if (encontrados.nome || encontrados.descricao || carregando) return;

    const texto = descricao.trim();
    definirCarregando(true);
    const resultado = await api('/organizacoes', 'POST', {
      nome: nome.trim(),
      ...(texto ? { descricao: texto } : {}),
    });
    definirCarregando(false);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    definirEnviada(true);
  }

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
              A organização {nome.trim()} foi cadastrada e aguarda a autorização de um administrador
              do sistema.
            </Text>
            <View style={styles.etiqueta}>
              <Etiqueta texto="Situação atual: aguardando autorização" tom="alerta" />
            </View>
            <Botao titulo="Voltar ao início" aoTocar={() => router.back()} style={styles.botao} />
          </>
        ) : (
          <>
            <Text style={[styles.titulo, { color: tema.cores.texto }]}>Criar organização</Text>
            <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
              Informe os dados da organização. O cadastro passa pela autorização de um administrador
              do sistema antes de ficar disponível.
            </Text>

            {erro ? (
              <View style={styles.aviso}>
                <FaixaAviso
                  aviso={{ tom: 'erro', titulo: 'Não foi possível enviar', mensagem: erro }}
                />
              </View>
            ) : null}

            <View style={styles.campos}>
              <CampoTexto
                rotulo="Nome da organização"
                icone="business-outline"
                placeholder="Ex.: Conselho Municipal de Educação"
                value={nome}
                onChangeText={(valor) => {
                  definirNome(valor);
                  definirErros((atuais) => ({ ...atuais, nome: null }));
                  definirErro('');
                }}
                erro={erros.nome}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!carregando}
              />

              <CampoTexto
                rotulo="Descrição (opcional)"
                icone="document-text-outline"
                placeholder="Diga em poucas palavras o que a organização faz."
                value={descricao}
                onChangeText={(valor) => {
                  definirDescricao(valor);
                  definirErros((atuais) => ({ ...atuais, descricao: null }));
                }}
                erro={erros.descricao}
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
              aoTocar={enviar}
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
