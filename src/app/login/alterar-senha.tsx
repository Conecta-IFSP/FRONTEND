import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { Cartao } from '@/components/Cartao';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { validarConfirmacaoSenha, validarSenha } from '@/utils/validacao';

type DadosSenha = { atual: string; nova: string; confirmacao: string };

const VAZIO: DadosSenha = { atual: '', nova: '', confirmacao: '' };

export default function TelaAlterarSenha() {
  const { tema } = useTema();
  const { control, handleSubmit, reset, formState } = useForm<DadosSenha>({ defaultValues: VAZIO });
  const carregando = formState.isSubmitting;
  const [aviso, definirAviso] = useState<Aviso | null>(null);

  const salvar = handleSubmit(async ({ atual, nova }) => {
    definirAviso(null);
    const resultado = await api('/usuarios/me/senha', 'PATCH', {
      senha_atual: atual,
      nova_senha: nova,
    });

    if (!resultado.ok) {
      definirAviso({ tom: 'erro', titulo: 'Não foi possível alterar', mensagem: resultado.erro });
      return;
    }

    reset(VAZIO);
    definirAviso({
      tom: 'sucesso',
      titulo: 'Senha alterada',
      mensagem: 'Use a nova senha no próximo acesso.',
    });
  });

  return (
    <TelaComCabecalho titulo="Alterar senha">
      <Cartao>
        <Text style={[styles.titulo, { color: tema.cores.texto }]}>Segurança da conta</Text>
        <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
          Confirme sua senha atual antes de escolher uma nova.
        </Text>

        {aviso ? (
          <View style={styles.aviso}>
            <FaixaAviso aviso={aviso} />
          </View>
        ) : null}

        <View style={styles.campos}>
          <CampoTextoControlado
            controle={control}
            nome="atual"
            validar={validarSenha}
            rotulo="Senha atual"
            placeholder="Senha atual"
            icone="lock-closed-outline"
            secureTextEntry
            autoCapitalize="none"
            editable={!carregando}
          />

          <CampoTextoControlado
            controle={control}
            nome="nova"
            validar={validarSenha}
            rotulo="Nova senha"
            placeholder="Nova senha"
            icone="key-outline"
            secureTextEntry
            autoCapitalize="none"
            editable={!carregando}
          />

          <CampoTextoControlado
            controle={control}
            nome="confirmacao"
            validar={(confirmacao, valores) => validarConfirmacaoSenha(valores.nova, confirmacao)}
            rotulo="Confirmar nova senha"
            placeholder="Confirmar senha"
            icone="checkmark-circle-outline"
            secureTextEntry
            autoCapitalize="none"
            editable={!carregando}
            returnKeyType="go"
            onSubmitEditing={() => void salvar()}
          />
        </View>

        <Botao
          titulo="Alterar senha"
          tituloCarregando="Salvando..."
          carregando={carregando}
          aoTocar={() => void salvar()}
          style={styles.botao}
        />
      </Cartao>
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  titulo: { ...TIPOGRAFIA.titulo },
  descricao: { ...TIPOGRAFIA.corpoPequeno, marginTop: ESPACO.xs },
  aviso: { marginTop: ESPACO.lg - 4 },
  campos: { marginTop: ESPACO.lg, gap: ESPACO.md },
  botao: { marginTop: ESPACO.lg },
});
