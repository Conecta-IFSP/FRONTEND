import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { autenticarComDispositivo } from '@/services/autenticacao-local';
import { validarConfirmacaoSenha, validarSenha } from '@/utils/validacao';

export default function TelaRedefinirSenha() {
  const router = useRouter();
  const { tema } = useTema();
  const { token = '' } = useLocalSearchParams<{ token?: string }>();
  const { control, handleSubmit, setFocus, formState } = useForm<{ senha: string; confirmacao: string }>({
    defaultValues: { senha: '', confirmacao: '' },
  });
  const carregando = formState.isSubmitting;
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [redefinida, definirRedefinida] = useState(false);

  const redefinir = handleSubmit(async ({ senha }) => {
    definirAviso(null);
    const autenticado = await autenticarComDispositivo().catch(() => false);
    if (!autenticado) return;
    const resultado = await api('/auth/redefinir-senha', 'POST', { token, nova_senha: senha });
    definirRedefinida(resultado.ok);
    definirAviso(
      resultado.ok
        ? { tom: 'sucesso', titulo: 'Senha redefinida', mensagem: 'Você já pode entrar com a nova senha.' }
        : { tom: 'erro', titulo: 'Não foi possível redefinir', mensagem: resultado.erro },
    );
  });

  return (
    <TelaComCabecalho
      titulo="Nova senha"
      aoVoltar={() => router.replace('/login')}
      rotuloVoltar="Voltar ao login"
      rodape={
        redefinida ? (
          <Botao titulo="Ir para o login" pilula aoTocar={() => router.replace('/login')} />
        ) : (
          <Botao
            titulo="Salvar senha"
            tituloCarregando="Salvando..."
            pilula
            carregando={carregando}
            aoTocar={() => void redefinir()}
          />
        )
      }
    >
      <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
        Escolha uma nova senha para entrar no Conecta+.
      </Text>

      {aviso ? <FaixaAviso aviso={aviso} /> : null}

      <CampoTextoControlado
        controle={control}
        nome="senha"
        validar={validarSenha}
        rotulo="Nova senha"
        placeholder="Nova senha"
        icone="lock-closed-outline"
        secureTextEntry
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => setFocus('confirmacao')}
        editable={!carregando && !redefinida}
        compacto
      />

      <CampoTextoControlado
        controle={control}
        nome="confirmacao"
        validar={(confirmacao, valores) => validarConfirmacaoSenha(valores.senha, confirmacao)}
        rotulo="Confirmar nova senha"
        placeholder="Confirmar senha"
        icone="lock-closed-outline"
        secureTextEntry
        autoCapitalize="none"
        editable={!carregando && !redefinida}
        returnKeyType="go"
        onSubmitEditing={() => void redefinir()}
        compacto
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  descricao: { ...TIPOGRAFIA.corpo },
});
