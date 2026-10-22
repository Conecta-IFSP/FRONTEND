import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { FaixaAviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { validarConfirmacaoSenha, validarSenha } from '@/utils/validacao';

type DadosSenha = { atual: string; nova: string; confirmacao: string };

const VAZIO: DadosSenha = { atual: '', nova: '', confirmacao: '' };

export default function TelaAlterarSenha() {
  const router = useRouter();
  const { cores } = useTema().tema;
  const { control, handleSubmit, formState } = useForm<DadosSenha>({ defaultValues: VAZIO });
  const carregando = formState.isSubmitting;
  const [erro, definirErro] = useState('');
  const [concluido, definirConcluido] = useState(false);
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

    definirConcluido(true);
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
        concluido ? (
          <Botao titulo="Voltar ao perfil" pilula aoTocar={voltar} />
        ) : (
          <Botao
            titulo="Alterar senha"
            tituloCarregando="Salvando..."
            pilula
            carregando={carregando}
            aoTocar={() => void salvar()}
          />
        )
      }
    >
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}

      {concluido ? (
        <View style={styles.concluido}>
          <View style={[styles.selo, { backgroundColor: cores.sucessoSuave }]}>
            <Ionicons name="checkmark" size={34} color={cores.sucesso} />
          </View>
          <Text style={[styles.titulo, { color: cores.texto }]} accessibilityRole="header">
            Senha alterada
          </Text>
        </View>
      ) : (
        <>
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
            compacto
          />

          <CampoTextoControlado
            controle={control}
            nome="nova"
            validar={validarSenha}
            rotulo="Nova senha"
            placeholder="Nova senha"
            icone="key-outline"
            secureTextEntry={!visiveis.nova}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!carregando}
            acaoFinal={olho('nova')}
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
        </>
      )}
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  concluido: { alignItems: 'center', gap: ESPACO.sm, paddingTop: ESPACO.xl },
  selo: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  titulo: { ...TIPOGRAFIA.subtitulo },
});
