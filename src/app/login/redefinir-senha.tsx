/** Tela de nova senha a partir do link recebido por e-mail. */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Cartao } from '@/components/Cartao';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { FundoGradiente } from '@/components/FundoGradiente';
import { Logo } from '@/components/Logo';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { validarConfirmacaoSenha, validarSenha } from '@/utils/validacao';

export default function TelaRedefinirSenha() {
  const router = useRouter();
  const { tema } = useTema();
  const { token = '' } = useLocalSearchParams<{ token?: string }>();
  const [senha, definirSenha] = useState('');
  const [confirmacao, definirConfirmacao] = useState('');
  const [erros, definirErros] = useState<{ senha: string | null; confirmacao: string | null }>({
    senha: null,
    confirmacao: null,
  });
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [redefinida, definirRedefinida] = useState(false);
  const [carregando, definirCarregando] = useState(false);

  async function redefinir() {
    const encontrados = {
      senha: validarSenha(senha),
      confirmacao: validarConfirmacaoSenha(senha, confirmacao),
    };
    definirErros(encontrados);
    definirAviso(null);
    if (encontrados.senha || encontrados.confirmacao || carregando) return;

    definirCarregando(true);
    const resultado = await api('/auth/redefinir-senha', 'POST', { token, nova_senha: senha });
    definirCarregando(false);
    definirRedefinida(resultado.ok);
    definirAviso(
      resultado.ok
        ? {
            tom: 'sucesso',
            titulo: 'Senha redefinida',
            mensagem: 'Você já pode entrar com a nova senha.',
          }
        : { tom: 'erro', titulo: 'Não foi possível redefinir', mensagem: resultado.erro },
    );
  }

  return (
    <FundoGradiente aoVoltar={() => router.replace('/login')} rotuloVoltar="Voltar ao login">
      <Logo largura={150} />

      <Cartao style={styles.cartao}>
        <Text style={[styles.titulo, { color: tema.cores.texto }]}>Criar nova senha</Text>
        <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
          Escolha uma nova senha para acessar o Conecta+.
        </Text>

        {aviso ? (
          <View style={styles.aviso}>
            <FaixaAviso aviso={aviso} />
          </View>
        ) : null}

        <View style={styles.campos}>
          <CampoTexto
            rotulo="Nova senha"
            icone="lock-closed-outline"
            placeholder="Nova senha"
            value={senha}
            onChangeText={(valor) => {
              definirSenha(valor);
              definirErros((atuais) => ({ ...atuais, senha: null }));
            }}
            erro={erros.senha}
            secureTextEntry
            autoCapitalize="none"
            editable={!carregando && !redefinida}
          />

          <CampoTexto
            rotulo="Confirmar nova senha"
            icone="lock-closed-outline"
            placeholder="Digite novamente"
            value={confirmacao}
            onChangeText={(valor) => {
              definirConfirmacao(valor);
              definirErros((atuais) => ({ ...atuais, confirmacao: null }));
            }}
            erro={erros.confirmacao}
            secureTextEntry
            autoCapitalize="none"
            editable={!carregando && !redefinida}
            returnKeyType="go"
            onSubmitEditing={redefinir}
          />
        </View>

        {redefinida ? (
          <Botao
            titulo="Voltar para o login"
            icone="log-in-outline"
            aoTocar={() => router.replace('/login')}
            style={styles.botao}
          />
        ) : (
          <Botao
            titulo="Redefinir senha"
            tituloCarregando="Salvando..."
            carregando={carregando}
            aoTocar={redefinir}
            style={styles.botao}
          />
        )}
      </Cartao>
    </FundoGradiente>
  );
}

const styles = StyleSheet.create({
  cartao: { marginTop: ESPACO.lg },
  titulo: { ...TIPOGRAFIA.titulo },
  descricao: { ...TIPOGRAFIA.corpoPequeno, marginTop: ESPACO.xs },
  aviso: { marginTop: ESPACO.lg - 4 },
  campos: { marginTop: ESPACO.lg, gap: ESPACO.md },
  botao: { marginTop: ESPACO.lg },
});
