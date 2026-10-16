import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
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
  const { control, handleSubmit, formState } = useForm<{ email: string }>({
    defaultValues: { email: '' },
  });
  const carregando = formState.isSubmitting;
  const [aviso, definirAviso] = useState<Aviso | null>(null);

  const enviar = handleSubmit(async ({ email }) => {
    definirAviso(null);
    const resultado = await api<{ mensagem: string }>('/auth/recuperar-conta', 'POST', {
      email: normalizarEmail(email),
      redirect_url: Linking.createURL('login/redefinir-senha'),
    });
    definirAviso(
      resultado.ok
        ? { tom: 'informacao', titulo: 'Confira seu e-mail', mensagem: resultado.dados.mensagem }
        : { tom: 'erro', titulo: 'Não foi possível enviar', mensagem: resultado.erro },
    );
  });

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
          <CampoTextoControlado
            controle={control}
            nome="email"
            validar={validarEmail}
            rotulo="E-mail"
            icone="mail-outline"
            placeholder="E-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!carregando}
            returnKeyType="send"
            onSubmitEditing={() => void enviar()}
          />
        </View>

        <Botao
          titulo="Enviar link"
          tituloCarregando="Enviando..."
          carregando={carregando}
          aoTocar={() => void enviar()}
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
