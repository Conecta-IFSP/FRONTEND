import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Cartao } from '@/components/Cartao';
import { FaixaAviso } from '@/components/FaixaAviso';
import { FundoGradiente } from '@/components/FundoGradiente';
import { Logo } from '@/components/Logo';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';

export default function TelaVerificarCadastro() {
  const router = useRouter();
  const { tema } = useTema();
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
    router.replace('/login');
  }

  const entrada = useRef<TextInput>(null);
  const caracteres = codigo.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 7).split('');
  const focarEntrada = () => entrada.current?.focus();

  return <FundoGradiente aoVoltar={() => router.back()}>
    <Logo largura={150} />
    <Cartao style={styles.cartao}>
      <Text style={[styles.titulo, { color: tema.cores.texto }]}>Confirme seu e-mail</Text>
      <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>Digite o código enviado para</Text>
      <Text style={[styles.email, { color: tema.cores.texto }]}>{parametros.email}</Text>
      {erro ? <View style={styles.aviso}><FaixaAviso aviso={{ tom: 'erro', titulo: 'Código inválido', mensagem: erro }} /></View> : null}

      <Pressable style={styles.codigoLinha} onPress={focarEntrada} accessibilityLabel="Código de confirmação">
        {Array.from({ length: 7 }, (_, indice) => <View key={indice} style={styles.grupo}>
          <View style={[styles.caixa, indice === caracteres.length && styles.caixaAtiva]}>
            <Text style={styles.caractere}>{caracteres[indice] ?? ''}</Text>
          </View>
          {indice === 2 ? <Text style={styles.separador}>-</Text> : null}
        </View>)}
      </Pressable>
      <TextInput ref={entrada} value={codigo} onChangeText={(valor) => { definirCodigo(valor.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 7)); definirErro(''); }} maxLength={8} autoCapitalize="characters" autoCorrect={false} keyboardType="default" onSubmitEditing={verificar} editable={!carregando} style={styles.entradaOculta} />
      <Botao titulo="Continuar" tituloCarregando="Confirmando..." carregando={carregando} aoTocar={verificar} style={styles.botao} />
      <Text style={[styles.rodape, { color: tema.cores.textoSuave }]}>A equipe Conecta+ nunca solicitará seu código nesta tela.</Text>
    </Cartao>
  </FundoGradiente>;
}

const styles = StyleSheet.create({
  cartao: { marginTop: ESPACO.lg, paddingHorizontal: 28, paddingVertical: 30, borderWidth: 1, borderColor: '#DDE3EF', borderRadius: 16 },
  titulo: { ...TIPOGRAFIA.titulo, textAlign: 'center', fontSize: 26, lineHeight: 34 },
  descricao: { ...TIPOGRAFIA.corpoPequeno, marginTop: 22, textAlign: 'center', fontSize: 16 },
  email: { textAlign: 'center', fontSize: 16, fontWeight: '600', marginTop: 3 },
  aviso: { marginTop: ESPACO.lg - 4 },
  codigoLinha: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28, gap: 7 },
  grupo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  caixa: { width: 39, height: 54, borderWidth: 1.5, borderColor: '#D3DAE8', borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  caixaAtiva: { borderColor: '#256EF1', borderWidth: 2, shadowColor: '#256EF1', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } },
  caractere: { color: '#18243C', fontSize: 28, fontWeight: '700' },
  separador: { color: '#4E5A78', fontSize: 25, fontWeight: '600' },
  entradaOculta: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  botao: { marginTop: 28 },
  rodape: { ...TIPOGRAFIA.corpoPequeno, textAlign: 'center', marginTop: 24, fontSize: 13 },
});
