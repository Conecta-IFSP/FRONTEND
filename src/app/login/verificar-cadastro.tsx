import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Botao } from '@/components/Botao';
import { FaixaAviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';

export default function TelaVerificarCadastro() {
  const router = useRouter();
  const { tema } = useTema();
  const { cores } = tema;
  const parametros = useLocalSearchParams<{ email?: string }>();
  const [codigo, definirCodigo] = useState('');
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(false);
  const entrada = useRef<TextInput>(null);

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
    router.replace('/login');
  }

  const caracteres = codigo.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 7).split('');

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

      <Pressable
        style={styles.codigoLinha}
        onPress={() => entrada.current?.focus()}
        accessibilityLabel="Código de confirmação"
      >
        {Array.from({ length: 7 }, (_, indice) => (
          <View key={indice} style={styles.grupo}>
            <View
              style={[
                styles.caixa,
                {
                  backgroundColor: cores.campoFundo,
                  borderColor: indice === caracteres.length ? cores.campoBordaFoco : cores.campoBorda,
                },
              ]}
            >
              <Text style={[styles.caractere, { color: cores.texto }]}>{caracteres[indice] ?? ''}</Text>
            </View>
            {indice === 2 ? <Text style={[styles.separador, { color: cores.textoSuave }]}>-</Text> : null}
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={entrada}
        value={codigo}
        onChangeText={(valor) => {
          definirCodigo(valor.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 7));
          definirErro('');
        }}
        maxLength={8}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        onSubmitEditing={() => void verificar()}
        editable={!carregando}
        style={styles.entradaOculta}
      />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  descricao: { ...TIPOGRAFIA.corpo },
  email: { fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 24 },
  codigoLinha: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: ESPACO.sm },
  grupo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  caixa: { width: 40, height: 52, borderWidth: 1.5, borderRadius: RAIO.md, alignItems: 'center', justifyContent: 'center' },
  caractere: { fontFamily: FONTES.titulo, fontSize: 24, lineHeight: 30 },
  separador: { fontFamily: FONTES.titulo, fontSize: 22 },
  entradaOculta: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
