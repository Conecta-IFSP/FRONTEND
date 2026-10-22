import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { TIPOGRAFIA } from '@/constants/theme';
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
    <TelaComCabecalho
      titulo="Recuperar conta"
      aoVoltar={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
      rodape={
        <Botao
          titulo="Enviar link"
          tituloCarregando="Enviando..."
          pilula
          carregando={carregando}
          aoTocar={() => void enviar()}
        />
      }
    >
      <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
        Enviaremos um link para você criar uma nova senha.
      </Text>

      {aviso ? <FaixaAviso aviso={aviso} /> : null}

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
        compacto
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  descricao: { ...TIPOGRAFIA.corpo },
});
