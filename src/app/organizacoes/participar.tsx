import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { FaixaAviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { mascararCodigo, validarCodigo } from '@/utils/validacao';

type Pedido = { mensagem: string; organizacao: { _id: string; nome: string } };

export default function TelaEntrarComCodigo() {
  const router = useRouter();
  const { cores } = useTema().tema;
  const [erro, definirErro] = useState('');
  const [enviado, definirEnviado] = useState<Pedido | null>(null);
  const { control, handleSubmit, formState } = useForm<{ codigo: string }>({
    defaultValues: { codigo: '' },
  });
  const enviando = formState.isSubmitting;

  const enviar = handleSubmit(async ({ codigo }) => {
    definirErro('');
    const resultado = await api<Pedido>('/organizacoes/entrar', 'POST', { codigo });
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    definirEnviado(resultado.dados);
  });

  if (enviado) {
    return (
      <TelaComCabecalho
        titulo="Entrar com código"
        rodape={<Botao titulo="Ver organizações" pilula aoTocar={() => router.navigate('/organizacoes')} />}
      >
        <View style={styles.sucesso}>
          <View style={[styles.selo, { backgroundColor: cores.sucessoSuave }]}>
            <Ionicons name="checkmark" size={34} color={cores.sucesso} />
          </View>
          <Text style={[styles.titulo, { color: cores.texto }]} accessibilityRole="header">
            Pedido enviado
          </Text>
          <Text style={[styles.texto, { color: cores.textoSuave }]}>{enviado.organizacao.nome}</Text>
          <Text style={[styles.detalhe, { color: cores.textoSutil }]}>Aguardando autorização do administrador.</Text>
        </View>
      </TelaComCabecalho>
    );
  }

  return (
    <TelaComCabecalho
      titulo="Entrar com código"
      rodape={
        <Botao
          titulo="Enviar pedido"
          tituloCarregando="Enviando..."
          pilula
          carregando={enviando}
          aoTocar={() => void enviar()}
        />
      }
    >
      <View style={styles.topo}>
        <View style={[styles.icone, { backgroundColor: cores.primariaSuave }]}>
          <Ionicons name="key-outline" size={30} color={cores.primaria} />
        </View>
        <Text style={[styles.texto, { color: cores.textoSuave }]}>
          Digite o código recebido do administrador da organização.
        </Text>
      </View>

      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}

      <CampoTextoControlado
        controle={control}
        nome="codigo"
        rotulo="Código"
        icone="key-outline"
        placeholder="XXXXX-XXXXX"
        validar={validarCodigo}
        formatar={mascararCodigo}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={11}
        returnKeyType="send"
        onSubmitEditing={() => void enviar()}
        editable={!enviando}
        style={styles.codigo}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  topo: { alignItems: 'center', gap: ESPACO.md - 4, paddingVertical: ESPACO.sm },
  icone: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texto: { ...TIPOGRAFIA.corpo, textAlign: 'center' },
  codigo: { fontFamily: FONTES.titulo, fontSize: 18, letterSpacing: 2 },
  sucesso: { alignItems: 'center', gap: ESPACO.sm, paddingTop: ESPACO.xxl },
  selo: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: FONTES.titulo, fontSize: 20, lineHeight: 28, marginTop: ESPACO.xs },
  detalhe: { ...TIPOGRAFIA.corpoPequeno, textAlign: 'center' },
});
