/**
 * Tela de dados pessoais: carrega e salva o nome, o e-mail e o tema preferido da
 * conta, e reúne a troca de senha e a saída da conta.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { FaixaAviso, type Aviso } from '@/components/FaixaAviso';
import { Opcao } from '@/components/Opcao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { ehPreferenciaTema, useTema, type PreferenciaTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';
import { useSessao } from '@/contexts/SessaoContext';
import { normalizarEmail, validarEmail, validarNome } from '@/utils/validacao';

type Perfil = { nome: string; email: string; tema?: string };

const OPCOES_TEMA: {
  valor: PreferenciaTema;
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
}[] = [
  { valor: 'sistema', titulo: 'Sistema', icone: 'phone-portrait-outline' },
  { valor: 'claro', titulo: 'Claro', icone: 'sunny-outline' },
  { valor: 'escuro', titulo: 'Escuro', icone: 'moon-outline' },
];

export default function TelaPerfil() {
  const router = useRouter();
  const sessao = useSessao();
  const { tema, preferencia, definirPreferencia } = useTema();
  const [nome, definirNome] = useState('');
  const [email, definirEmail] = useState('');
  const [erros, definirErros] = useState<{ nome: string | null; email: string | null }>({
    nome: null,
    email: null,
  });
  const [aviso, definirAviso] = useState<Aviso | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [salvando, definirSalvando] = useState(false);

  useEffect(() => {
    let ativa = true;

    void api<Perfil>('/usuarios/me').then((resultado) => {
      if (!ativa) return;
      definirCarregando(false);
      if (!resultado.ok) {
        definirAviso({ tom: 'erro', titulo: 'Não foi possível carregar', mensagem: resultado.erro });
        return;
      }
      definirNome(resultado.dados.nome);
      definirEmail(resultado.dados.email);
      if (ehPreferenciaTema(resultado.dados.tema)) definirPreferencia(resultado.dados.tema);
    });

    return () => {
      ativa = false;
    };
  }, [definirPreferencia]);

  async function salvar() {
    const encontrados = { nome: validarNome(nome), email: validarEmail(email) };
    definirErros(encontrados);
    definirAviso(null);
    if (encontrados.nome || encontrados.email || salvando) return;

    definirSalvando(true);
    const resultado = await api<Perfil>('/usuarios/me', 'PATCH', {
      nome: nome.trim(),
      email: normalizarEmail(email),
      tema: preferencia,
    });
    definirSalvando(false);
    definirAviso(
      resultado.ok
        ? {
            tom: 'sucesso',
            titulo: 'Perfil atualizado',
            mensagem: 'Seus dados e sua preferência de tema foram salvos.',
          }
        : { tom: 'erro', titulo: 'Não foi possível salvar', mensagem: resultado.erro },
    );
  }

  async function sair() {
    await sessao.sair();
  }

  return (
    <TelaComCabecalho titulo="Perfil">
      {carregando ? (
        <Carregando rotulo="Carregando perfil" />
      ) : (
        <Cartao>
          <Text style={[styles.titulo, { color: tema.cores.texto }]}>Dados pessoais</Text>
          <Text style={[styles.descricao, { color: tema.cores.textoSuave }]}>
            Atualize as informações usadas na sua conta.
          </Text>

          {aviso ? (
            <View style={styles.aviso}>
              <FaixaAviso aviso={aviso} />
            </View>
          ) : null}

          <View style={styles.campos}>
            <CampoTexto
              rotulo="Nome"
              icone="person-outline"
              value={nome}
              onChangeText={(valor) => {
                definirNome(valor);
                definirErros((atuais) => ({ ...atuais, nome: null }));
              }}
              erro={erros.nome}
              autoCapitalize="words"
              editable={!salvando}
            />

            <CampoTexto
              rotulo="E-mail"
              icone="mail-outline"
              value={email}
              onChangeText={(valor) => {
                definirEmail(valor);
                definirErros((atuais) => ({ ...atuais, email: null }));
              }}
              erro={erros.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!salvando}
            />
          </View>

          <Text style={[styles.rotuloTema, { color: tema.cores.textoSuave }]}>Tema preferido</Text>
          <View style={styles.opcoesTema}>
            {OPCOES_TEMA.map((opcao) => (
              <Opcao
                key={opcao.valor}
                titulo={opcao.titulo}
                icone={opcao.icone}
                selecionado={preferencia === opcao.valor}
                aoTocar={() => definirPreferencia(opcao.valor)}
                desabilitado={salvando}
                empilhado
                style={styles.opcaoTema}
              />
            ))}
          </View>

          <Botao
            titulo="Salvar alterações"
            tituloCarregando="Salvando..."
            carregando={salvando}
            aoTocar={salvar}
            style={styles.botao}
          />
          <Botao
            titulo="Alterar minha senha"
            variante="secundario"
            icone="key-outline"
            aoTocar={() => router.push('/login/alterar-senha')}
            style={styles.botaoSecundario}
          />
        </Cartao>
      )}

      <Botao titulo="Sair da conta" variante="perigo" icone="log-out-outline" aoTocar={sair} />
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  titulo: { ...TIPOGRAFIA.titulo },
  descricao: { ...TIPOGRAFIA.corpoPequeno, marginTop: ESPACO.xs },
  aviso: { marginTop: ESPACO.lg - 4 },
  campos: { marginTop: ESPACO.lg, gap: ESPACO.md },
  rotuloTema: { ...TIPOGRAFIA.rotulo, marginTop: ESPACO.lg, marginBottom: ESPACO.sm },
  opcoesTema: { flexDirection: 'row', gap: ESPACO.sm },
  opcaoTema: { flex: 1 },
  botao: { marginTop: ESPACO.lg },
  botaoSecundario: { marginTop: ESPACO.md - 4 },
});
