import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

import { LinhaLista, SecaoLista } from '@/components/ListaAgrupada';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { DESCRICAO_APP, DISCIPLINA, EQUIPE, LINKS_SOBRE, PROJETO_ACADEMICO } from '@/constants/sobre';
import { ESPACO, FONTES, LOGOS, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { useToast } from '@/contexts/ToastContext';
import { textoVersao } from '@/utils/versao';

type Link = { chave: string; icone: IoniconsIconName; titulo: string; subtitulo?: string; url: string };

const TODOS_OS_LINKS: Link[] = [
  {
    chave: 'privacidade',
    icone: 'shield-checkmark-outline',
    titulo: 'Política de privacidade',
    url: LINKS_SOBRE.politicaPrivacidade,
  },
  { chave: 'termos', icone: 'document-text-outline', titulo: 'Termos de uso', url: LINKS_SOBRE.termosUso },
  { chave: 'licencas', icone: 'library-outline', titulo: 'Licenças de código aberto', url: LINKS_SOBRE.licencas },
  {
    chave: 'codigo',
    icone: 'logo-github',
    titulo: 'Código-fonte',
    subtitulo: 'GitHub · Conecta-IFSP',
    url: LINKS_SOBRE.codigoFonte,
  },
  {
    chave: 'contato',
    icone: 'mail-outline',
    titulo: 'Contato e suporte',
    subtitulo: LINKS_SOBRE.emailContato,
    url: LINKS_SOBRE.emailContato ? `mailto:${LINKS_SOBRE.emailContato}` : '',
  },
];

// Links sem URL definida em constants/sobre.ts ficam ocultos.
const LINKS = TODOS_OS_LINKS.filter((link) => Boolean(link.url));

export default function TelaSobre() {
  const { cores } = useTema().tema;
  const { mostrarToast } = useToast();

  async function abrir(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      mostrarToast('Não foi possível abrir o link.', 'erro');
    }
  }

  return (
    <TelaComCabecalho titulo="Sobre o app">
      <View style={[styles.cartao, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
        <Image
          source={LOGOS.simbolo}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <Text style={[styles.nome, { color: cores.texto }]} accessibilityRole="header">
          Conecta<Text style={{ color: cores.primaria }}>+</Text>
        </Text>
        <Text style={[styles.versao, { color: cores.textoSuave }]}>{textoVersao()}</Text>
        <Text style={[styles.descricao, { color: cores.textoSuave }]}>{DESCRICAO_APP}</Text>
      </View>

      <View>
        <Text style={[styles.tituloSecao, { color: cores.texto }]} accessibilityRole="header">
          Projeto acadêmico
        </Text>
        <View style={[styles.bloco, { backgroundColor: cores.superficie, borderColor: cores.bordaSuave }]}>
          <Text style={[styles.texto, { color: cores.texto }]}>{PROJETO_ACADEMICO}</Text>
          {DISCIPLINA ? (
            <View style={styles.item}>
              <Text style={[styles.rotulo, { color: cores.textoSuave }]}>Disciplina</Text>
              <Text style={[styles.texto, { color: cores.texto }]}>{DISCIPLINA}</Text>
            </View>
          ) : null}
          {EQUIPE.length > 0 ? (
            <View style={styles.item}>
              <Text style={[styles.rotulo, { color: cores.textoSuave }]}>Equipe</Text>
              {EQUIPE.map((pessoa) => (
                <Text key={pessoa} style={[styles.texto, { color: cores.texto }]}>
                  {pessoa}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {LINKS.length > 0 ? (
        <SecaoLista titulo="Links">
          {LINKS.map((link) => (
            <LinhaLista
              key={link.chave}
              icone={link.icone}
              titulo={link.titulo}
              subtitulo={link.subtitulo}
              dica="Abre fora do app"
              aoTocar={() => void abrir(link.url)}
            />
          ))}
        </SecaoLista>
      ) : null}
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  cartao: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: ESPACO.lg,
    paddingHorizontal: ESPACO.md,
    borderWidth: 1,
    borderRadius: RAIO.lg,
  },
  logo: { width: 64, height: 64 * (252 / 236), marginBottom: ESPACO.sm },
  nome: { ...TIPOGRAFIA.subtitulo },
  versao: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  descricao: { ...TIPOGRAFIA.corpoPequeno, textAlign: 'center', marginTop: ESPACO.sm + 4 },
  tituloSecao: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  bloco: { borderWidth: 1, borderRadius: RAIO.lg, padding: ESPACO.md, gap: ESPACO.md - 4 },
  item: { gap: 2 },
  rotulo: { ...TIPOGRAFIA.legenda },
  texto: { ...TIPOGRAFIA.corpoPequeno },
});
