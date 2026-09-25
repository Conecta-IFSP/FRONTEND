/** Tela de recuperação de conta: envia o link temporário de redefinição de senha. */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Cartao } from '@/components/Cartao';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { FundoGradiente } from '@/components/FundoGradiente';
import { Logo } from '@/components/Logo';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { normalizarEmail, validarEmail } from '@/utils/validacao';

export default function TelaRecuperarConta() {
  const router = useRouter();
  const { tema } = useTema();
  const [email, definirEmail] = useState('');
  const [erroCampo, definirErroCampo] = useState<string | null>(null);
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [carregando, definirCarregando] = useState(false);

  async function enviar() {
    const encontrado = validarEmail(email);
    definirErroCampo(encontrado);
    definirAviso(null);
    if (encontrado || carregando) return;

    definirCarregando(true);
    const resultado = await api<{ mensagem: string }>('/auth/recuperar-conta', 'POST', {
      email: normalizarEmail(email),
    });
    definirCarregando(false);
    definirAviso(
      resultado.ok
        ? { tom: 'informacao', titulo: 'Confira seu e-mail', mensagem: resultado.dados.mensagem }
        : { tom: 'erro', titulo: 'Não foi possível enviar', mensagem: resultado.erro },
    );
  }

  return (
    <FundoGradiente aoVoltar={() => router.back()}>
      <Logo largura={150} />

      <Cartao style={styles.cartao}>
        <Text style={[styles.titulo, { color: tema.cores.texto }]}>Recuperar conta</Text>
        <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
          Informe o e-mail do cadastro. Enviaremos um link válido por 30 minutos para você criar uma
          nova senha.
        </Text>

        {aviso ? (
          <View style={styles.aviso}>
            <FaixaAviso aviso={aviso} />
          </View>
        ) : null}

        <View style={styles.campos}>
          <CampoTexto
            rotulo="E-mail"
            icone="mail-outline"
            placeholder="nome@organizacao.com"
            value={email}
            onChangeText={(valor) => {
              definirEmail(valor);
              definirErroCampo(null);
              definirAviso(null);
            }}
            erro={erroCampo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!carregando}
            returnKeyType="send"
            onSubmitEditing={enviar}
          />
        </View>

        <Botao
          titulo="Enviar link"
          tituloCarregando="Enviando..."
          carregando={carregando}
          aoTocar={enviar}
          style={styles.botao}
        />
      </Cartao>
    </FundoGradiente>
  );
}

const styles = StyleSheet.create({
  cartao: { marginTop: ESPACO.lg },
  titulo: { ...TIPOGRAFIA.titulo },
  descricao: { ...TIPOGRAFIA.corpoPequeno, marginTop: ESPACO.xs },
  aviso: { marginTop: ESPACO.lg - 4 },
  campos: { marginTop: ESPACO.lg },
  botao: { marginTop: ESPACO.lg },
});
