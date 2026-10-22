import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useForm } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoCodigo, CampoTextoControlado } from '@/components/CampoTexto';
import { FaixaAviso } from '@/components/FaixaAviso';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { normalizarEmail, validarEmail } from '@/utils/validacao';

type Etapa = 'novo' | 'codigo' | 'concluido';

export default function TelaTrocarEmail() {
  const router = useRouter();
  const sessao = useSessao();
  const { cores } = useTema().tema;
  const [etapa, definirEtapa] = useState<Etapa>('novo');
  const [atual, definirAtual] = useState('');
  const [novo, definirNovo] = useState('');
  const [codigo, definirCodigo] = useState('');
  const [erro, definirErro] = useState('');
  const [enviando, definirEnviando] = useState(false);
  const [reenviado, definirReenviado] = useState(false);
  const { control, handleSubmit } = useForm<{ email: string }>({ defaultValues: { email: '' } });

  useEffect(() => {
    let ativa = true;
    void api<{ email: string }>('/usuarios/me').then((resultado) => {
      if (ativa && resultado.ok) definirAtual(resultado.dados.email);
    });
    return () => {
      ativa = false;
    };
  }, []);

  function voltar() {
    if (etapa === 'codigo') {
      definirEtapa('novo');
      definirCodigo('');
      definirErro('');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/perfil');
  }

  async function solicitar(email: string) {
    definirEnviando(true);
    definirErro('');
    const resultado = await api('/usuarios/me/email/solicitar', 'POST', { email });
    definirEnviando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return false;
    }
    return true;
  }

  const enviarCodigo = handleSubmit(async ({ email }) => {
    const normalizado = normalizarEmail(email);
    if (!(await solicitar(normalizado))) return;
    definirNovo(normalizado);
    definirCodigo('');
    definirReenviado(false);
    definirEtapa('codigo');
  });

  async function reenviar() {
    if (enviando) return;
    if (await solicitar(novo)) definirReenviado(true);
  }

  async function confirmar() {
    if (enviando) return;
    if (codigo.length !== 7) {
      definirErro('Digite os 7 caracteres do código.');
      return;
    }
    definirEnviando(true);
    definirErro('');
    const resultado = await api('/usuarios/me/email/confirmar', 'POST', {
      email: novo,
      codigo: `${codigo.slice(0, 3)}-${codigo.slice(3)}`,
    });
    definirEnviando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    definirEtapa('concluido');
    void sessao.atualizar();
  }

  const rodape =
    etapa === 'novo' ? (
      <Botao
        titulo="Enviar código"
        tituloCarregando="Enviando..."
        pilula
        carregando={enviando}
        aoTocar={() => void enviarCodigo()}
      />
    ) : etapa === 'codigo' ? (
      <Botao
        titulo="Confirmar"
        tituloCarregando="Confirmando..."
        pilula
        carregando={enviando}
        aoTocar={() => void confirmar()}
      />
    ) : (
      <Botao titulo="Voltar ao perfil" pilula aoTocar={voltar} />
    );

  return (
    <TelaComCabecalho titulo="Trocar e-mail" aoVoltar={voltar} rodape={rodape}>
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}

      {etapa === 'novo' ? (
        <>
          <View style={[styles.atual, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
            <View style={[styles.icone, { backgroundColor: cores.superficieSuave }]}>
              <Ionicons name="mail-outline" size={18} color={cores.textoSutil} />
            </View>
            <View style={styles.textos}>
              <Text style={[styles.legenda, { color: cores.textoSuave }]}>E-mail atual</Text>
              <Text style={[styles.valor, { color: cores.texto }]} numberOfLines={1}>
                {atual}
              </Text>
            </View>
          </View>

          <CampoTextoControlado
            controle={control}
            nome="email"
            validar={(valor) =>
              validarEmail(valor) ?? (normalizarEmail(valor) === atual ? 'Use um e-mail diferente do atual.' : null)
            }
            rotulo="Novo e-mail"
            placeholder="E-mail"
            icone="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!enviando}
            returnKeyType="send"
            onSubmitEditing={() => void enviarCodigo()}
            compacto
          />
        </>
      ) : null}

      {etapa === 'codigo' ? (
        <>
          <View style={styles.centro}>
            <View style={[styles.selo, { backgroundColor: cores.primariaSuave }]}>
              <Ionicons name="mail-open-outline" size={30} color={cores.primaria} />
            </View>
            <Text style={[styles.legenda, styles.espaco, { color: cores.textoSuave }]}>Código enviado para</Text>
            <Text style={[styles.destaque, { color: cores.texto }]}>{novo}</Text>
          </View>

          <CampoCodigo
            valor={codigo}
            aoMudar={(valor) => {
              definirCodigo(valor);
              definirErro('');
            }}
            aoEnviar={() => void confirmar()}
            desabilitado={enviando}
          />

          <Pressable
            onPress={() => void reenviar()}
            disabled={enviando || reenviado}
            accessibilityRole="button"
            style={({ pressed }) => [styles.reenviar, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.textoReenviar, { color: reenviado ? cores.textoSutil : cores.primaria }]}>
              {reenviado ? 'Código reenviado' : 'Reenviar código'}
            </Text>
          </Pressable>
        </>
      ) : null}

      {etapa === 'concluido' ? (
        <View style={[styles.centro, styles.concluido]}>
          <View style={[styles.selo, styles.seloGrande, { backgroundColor: cores.sucessoSuave }]}>
            <Ionicons name="checkmark" size={34} color={cores.sucesso} />
          </View>
          <Text style={[styles.titulo, { color: cores.texto }]} accessibilityRole="header">
            E-mail alterado
          </Text>
          <Text style={[styles.legenda, { color: cores.textoSuave }]}>{novo}</Text>
        </View>
      ) : null}
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  atual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    padding: ESPACO.md - 4,
    borderWidth: 1,
    borderRadius: RAIO.lg,
  },
  icone: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
  legenda: { fontFamily: FONTES.corpo, fontSize: 14, lineHeight: 20 },
  valor: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  centro: { alignItems: 'center', gap: 2, paddingTop: ESPACO.sm },
  concluido: { paddingTop: ESPACO.xl },
  selo: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  seloGrande: { width: 72, height: 72, borderRadius: 36, marginBottom: ESPACO.sm },
  espaco: { marginTop: ESPACO.sm },
  destaque: { fontFamily: FONTES.titulo, fontSize: 16, lineHeight: 24 },
  titulo: { ...TIPOGRAFIA.subtitulo },
  reenviar: { alignSelf: 'center', height: 44, justifyContent: 'center', paddingHorizontal: ESPACO.md - 4 },
  textoReenviar: { fontFamily: FONTES.corpoMedio, fontSize: 14, lineHeight: 20 },
});
