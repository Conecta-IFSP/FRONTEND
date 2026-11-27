import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { FaixaAviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { useSessao } from '@/contexts/SessaoContext';
import { api } from '@/services/api';
import { REGRA_SENHA, validarConfirmacaoSenha, validarNovaSenha, validarSenha } from '@/utils/validacao';

type DadosSenha = { atual: string; nova: string; confirmacao: string };

const VAZIO: DadosSenha = { atual: '', nova: '', confirmacao: '' };

export default function TelaAlterarSenha() {
  const router = useRouter();
  const { sair } = useSessao();
  const { control, handleSubmit, setFocus, formState } = useForm<DadosSenha>({ defaultValues: VAZIO });
  const carregando = formState.isSubmitting;
  const [erro, definirErro] = useState('');
  const [visiveis, definirVisiveis] = useState<Record<keyof DadosSenha, boolean>>({
    atual: false,
    nova: false,
    confirmacao: false,
  });

  const salvar = handleSubmit(async ({ atual, nova }) => {
    definirErro('');
    const resultado = await api('/usuarios/me/senha', 'PATCH', {
      senha_atual: atual,
      nova_senha: nova,
    });

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    await sair('Senha alterada. Entre novamente com a nova senha.');
  });

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/perfil');
  }

  function olho(campo: keyof DadosSenha) {
    return {
      icone: visiveis[campo] ? ('eye-off-outline' as const) : ('eye-outline' as const),
      rotuloAcessivel: visiveis[campo] ? 'Ocultar senha' : 'Mostrar senha',
      aoTocar: () => definirVisiveis((atuais) => ({ ...atuais, [campo]: !atuais[campo] })),
    };
  }

  return (
    <TelaComCabecalho
      titulo="Alterar senha"
      aoVoltar={voltar}
      rodape={
        <Botao
          titulo="Alterar senha"
          tituloCarregando="Salvando..."
          pilula
          carregando={carregando}
          aoTocar={() => void salvar()}
        />
      }
    >
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}

      <FaixaAviso aviso={{ tom: 'informacao', mensagem: 'Depois de alterar, você precisará entrar de novo em todos os aparelhos.' }} />

      <CampoTextoControlado
        controle={control}
        nome="atual"
        validar={validarSenha}
        rotulo="Senha atual"
        placeholder="Senha atual"
        icone="lock-closed-outline"
        secureTextEntry={!visiveis.atual}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        editable={!carregando}
        acaoFinal={olho('atual')}
        returnKeyType="next"
        onSubmitEditing={() => setFocus('nova')}
        compacto
      />

      <CampoTextoControlado
        controle={control}
        nome="nova"
        validar={validarNovaSenha}
        ajuda={REGRA_SENHA}
        rotulo="Nova senha"
        placeholder="Nova senha"
        icone="key-outline"
        secureTextEntry={!visiveis.nova}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!carregando}
        acaoFinal={olho('nova')}
        returnKeyType="next"
        onSubmitEditing={() => setFocus('confirmacao')}
        compacto
      />

      <CampoTextoControlado
        controle={control}
        nome="confirmacao"
        validar={(confirmacao, valores) => validarConfirmacaoSenha(valores.nova, confirmacao)}
        rotulo="Confirmar nova senha"
        placeholder="Confirmar senha"
        icone="checkmark-circle-outline"
        secureTextEntry={!visiveis.confirmacao}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!carregando}
        acaoFinal={olho('confirmacao')}
        returnKeyType="go"
        onSubmitEditing={() => void salvar()}
        compacto
      />
    </TelaComCabecalho>
  );
}
