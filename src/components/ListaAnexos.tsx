import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';

import { ESPACO, FONTES, RAIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { formatarTamanho } from '@/services/anexos';

export type ItemAnexo = { chave: string; nome: string; tipo: string; tamanho: number };

type ListaAnexosProps = {
  titulo?: string;
  itens: ItemAnexo[];
  aoAdicionar?: () => void;
  aoAbrir?: (item: ItemAnexo) => void;
  aoRemover?: (item: ItemAnexo) => void;
  /** Chave do anexo que está sendo aberto, para mostrar o indicador de carregamento. */
  abrindo?: string | null;
  desabilitado?: boolean;
  limite?: number;
};

function iconeDoTipo(tipo: string): IoniconsIconName {
  if (tipo.startsWith('image/')) return 'image-outline';
  if (tipo.includes('spreadsheet') || tipo === 'text/csv') return 'grid-outline';
  if (tipo.includes('presentation')) return 'easel-outline';
  if (tipo === 'application/pdf') return 'document-text-outline';
  return 'document-outline';
}

export function ListaAnexos({
  titulo,
  itens,
  aoAdicionar,
  aoAbrir,
  aoRemover,
  abrindo = null,
  desabilitado = false,
  limite,
}: ListaAnexosProps) {
  const { cores } = useTema().tema;
  const cheio = limite !== undefined && itens.length >= limite;

  if (itens.length === 0 && !aoAdicionar) return null;

  return (
    <View>
      {titulo ? (
        <Text style={[styles.rotulo, { color: cores.texto }]}>
          {titulo}
          {limite !== undefined && itens.length > 0 ? (
            <Text style={{ color: cores.textoSutil }}>{`  ${itens.length}/${limite}`}</Text>
          ) : null}
        </Text>
      ) : null}
      <View style={[styles.caixa, { borderColor: cores.campoBorda, backgroundColor: cores.campoFundo }]}>
        {itens.map((item, indice) => (
          // A linha e o botão de remover ficam lado a lado: um botão dentro de outro quebra na web.
          <View
            key={item.chave}
            style={[
              styles.linha,
              indice > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cores.bordaSuave },
            ]}
          >
            <Pressable
              onPress={aoAbrir ? () => aoAbrir(item) : undefined}
              disabled={!aoAbrir || desabilitado || abrindo !== null}
              accessibilityRole={aoAbrir ? 'button' : undefined}
              accessibilityLabel={`${item.nome}, ${formatarTamanho(item.tamanho)}${aoAbrir ? ', abrir' : ''}`}
              style={({ pressed }) => [styles.conteudo, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.icone, { backgroundColor: cores.primariaSuave }]}>
                <Ionicons name={iconeDoTipo(item.tipo)} size={18} color={cores.primaria} />
              </View>
              <View style={styles.textos}>
                <Text numberOfLines={1} style={[styles.nome, { color: cores.texto }]}>
                  {item.nome}
                </Text>
                <Text style={[styles.tamanho, { color: cores.textoSuave }]}>{formatarTamanho(item.tamanho)}</Text>
              </View>
              {abrindo === item.chave ? (
                <ActivityIndicator size="small" color={cores.primaria} />
              ) : aoAbrir && !aoRemover ? (
                <Ionicons name="download-outline" size={18} color={cores.textoSutil} />
              ) : null}
            </Pressable>
            {aoRemover ? (
              <Pressable
                onPress={() => aoRemover(item)}
                disabled={desabilitado}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remover ${item.nome}`}
                style={({ pressed }) => [styles.remover, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="close" size={20} color={cores.textoSuave} />
              </Pressable>
            ) : null}
          </View>
        ))}

        {aoAdicionar ? (
          <Pressable
            onPress={aoAdicionar}
            disabled={desabilitado || cheio}
            accessibilityRole="button"
            accessibilityLabel="Adicionar anexo"
            style={({ pressed }) => [
              styles.linha,
              styles.adicionar,
              itens.length > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cores.bordaSuave },
              { opacity: desabilitado || cheio ? 0.5 : pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="attach" size={20} color={cores.primaria} />
            <Text style={[styles.textoAdicionar, { color: cores.primaria }]}>
              {cheio ? 'Limite de anexos atingido' : 'Adicionar anexo'}
            </Text>
            {itens.length === 0 ? (
              <Text style={[styles.dica, { color: cores.textoSutil }]}>PDF, imagem ou documento · até 10 MB</Text>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotulo: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  caixa: { borderWidth: 1.5, borderRadius: RAIO.md, overflow: 'hidden' },
  linha: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    paddingHorizontal: ESPACO.md - 2,
    paddingVertical: ESPACO.sm,
  },
  conteudo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: ESPACO.md - 4 },
  icone: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
  nome: { fontFamily: FONTES.corpo, fontSize: 15, lineHeight: 22 },
  tamanho: { ...TIPOGRAFIA.legenda },
  remover: { padding: 4 },
  adicionar: { flexWrap: 'wrap', gap: ESPACO.sm },
  textoAdicionar: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  dica: { ...TIPOGRAFIA.legenda, flexBasis: '100%', marginLeft: 28 },
});
