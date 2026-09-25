/** Tela de troca de senha com a conta já autenticada. */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Cartao } from '@/components/Cartao';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { validarConfirmacaoSenha, validarSenha } from '@/utils/validacao';

type Erros = { atual: string | null; nova: string | null; confirmacao: string | null };

export default function TelaAlterarSenha() {
  const { tema } = useTema();
  const [senhaAtual, definirSenhaAtual] = useState('');
  const [novaSenha, definirNovaSenha] = useState('');
  const [confirmacao, definirConfirmacao] = useState('');
  const [erros, definirErros] = useState<Erros>({
    atual: null,
    nova: null,
    confirmacao: null,
  });
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [carregando, definirCarregando] = useState(false);

  function limpar(campo: keyof Erros) {
    definirErros((atuais) => ({ ...atuais, [campo]: null }));
    definirAviso(null);
  }

  async function salvar() {
    const encontrados: Erros = {
      atual: validarSenha(senhaAtual),
      nova: validarSenha(novaSenha),
      confirmacao: validarConfirmacaoSenha(novaSenha, confirmacao),
    };
    definirErros(encontrados);
    definirAviso(null);
    if (Object.values(encontrados).some(Boolean) || carregando) return;

    definirCarregando(true);
    const resultado = await api('/usuarios/me/senha', 'PATCH', {
      senha_atual: senhaAtual,
      nova_senha: novaSenha,
    });
    definirCarregando(false);

    if (!resultado.ok) {
      definirAviso({ tom: 'erro', titulo: 'Não foi possível alterar', mensagem: resultado.erro });
      return;
    }

    definirSenhaAtual('');
    definirNovaSenha('');
    definirConfirmacao('');
    definirAviso({
      tom: 'sucesso',
      titulo: 'Senha alterada',
      mensagem: 'Use a nova senha no próximo acesso.',
    });
  }

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
          <CampoTexto
            rotulo="Senha atual"
            icone="lock-closed-outline"
            value={senhaAtual}
            onChangeText={(valor) => {
              definirSenhaAtual(valor);
              limpar('atual');
            }}
            erro={erros.atual}
            secureTextEntry
            autoCapitalize="none"
            editable={!carregando}
          />

          <CampoTexto
            rotulo="Nova senha"
            icone="key-outline"
            value={novaSenha}
            onChangeText={(valor) => {
              definirNovaSenha(valor);
              limpar('nova');
            }}
            erro={erros.nova}
            secureTextEntry
            autoCapitalize="none"
            editable={!carregando}
          />

          <CampoTexto
            rotulo="Confirmar nova senha"
            icone="checkmark-circle-outline"
            value={confirmacao}
            onChangeText={(valor) => {
              definirConfirmacao(valor);
              limpar('confirmacao');
            }}
            erro={erros.confirmacao}
            secureTextEntry
            autoCapitalize="none"
            editable={!carregando}
            returnKeyType="go"
            onSubmitEditing={salvar}
          />
        </View>

        <Botao
          titulo="Alterar senha"
          tituloCarregando="Salvando..."
          carregando={carregando}
          aoTocar={salvar}
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
