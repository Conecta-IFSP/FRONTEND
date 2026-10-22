import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Botao } from '@/components/Botao';
import { CampoCodigo } from '@/components/CampoTexto';
import { FaixaAviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';

export default function TelaVerificarCadastro() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const { tema } = useTema();
  const { cores } = tema;
  const parametros = useLocalSearchParams<{ email?: string }>();
  const [codigo, definirCodigo] = useState('');
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(false);

  async function verificar() {
    const valor = codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (valor.length !== 7 || carregando) {
      definirErro('Informe o código no formato A1C-4EFJ.');
      return;
    }
    definirCarregando(true);
    const resultado = await api('/auth/verificar-cadastro', 'POST', {
      email: parametros.email,
      codigo: `${valor.slice(0, 3)}-${valor.slice(3)}`,
    });
    definirCarregando(false);
    if (!resultado.ok) return definirErro(resultado.erro);
    mostrarToast('Conta criada com sucesso! Agora faça login para continuar.', 'sucesso', 5000);
    router.replace('/login');
  }

  return (
    <TelaComCabecalho
      titulo="Confirmar e-mail"
      aoVoltar={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
      rodape={
        <Botao
          titulo="Continuar"
          tituloCarregando="Confirmando..."
          pilula
          carregando={carregando}
          aoTocar={() => void verificar()}
        />
      }
    >
      <View>
        <Text style={[styles.descricao, { color: cores.textoSuave }]}>Digite o código enviado para</Text>
        <Text style={[styles.email, { color: cores.texto }]}>{parametros.email}</Text>
      </View>

      {erro ? <FaixaAviso aviso={{ tom: 'erro', titulo: 'Código inválido', mensagem: erro }} /> : null}

      <CampoCodigo
        valor={codigo}
        aoMudar={(valor) => {
          definirCodigo(valor);
          definirErro('');
        }}
        aoEnviar={() => void verificar()}
        desabilitado={carregando}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  descricao: { ...TIPOGRAFIA.corpo },
  email: { fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 24 },
});
