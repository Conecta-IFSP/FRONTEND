import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Etiqueta } from '@/components/Etiqueta';
import { FaixaAviso } from '@/components/FaixaAviso';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api } from '@/services/api';

type MinhasComissoes = {
  organizacao: { _id: string; nome: string };
  comissoes: { _id: string; nome: string; descricao?: string; ativo: boolean; meu_papel: 'MEMBRO' | 'RESPONSAVEL' }[];
};

export default function MinhasComissoes() {
  const router = useRouter();
  const { cores } = useTema().tema;
  const { organizacao_id: id } = useLocalSearchParams<{ organizacao_id?: string }>();
  const [dados, definirDados] = useState<MinhasComissoes | null>(null);
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(true);
  useFocusEffect(useCallback(() => {
    let ativa = true;
    definirDados(null);
    definirErro('');
    definirCarregando(true);
    if (!id) {
      definirErro('Selecione uma organização na tela inicial.');
      definirCarregando(false);
      return;
    }
    void api<MinhasComissoes>(`/comissoes/minhas/${encodeURIComponent(id)}`).then((resultado) => {
      if (!ativa) return;
      if (resultado.ok) definirDados(resultado.dados);
      else definirErro(resultado.erro);
      definirCarregando(false);
    });
    return () => { ativa = false; };
  }, [id]));

  return (
    <TelaComCabecalho titulo="Minhas comissões" aoVoltar={() => router.canGoBack() ? router.back() : router.replace('/inicio')}>
      {carregando ? <Carregando rotulo="Carregando suas comissões" /> : null}
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {dados ? <View style={{ gap: ESPACO.md }}>
        <Text style={[TIPOGRAFIA.subtitulo, { color: cores.texto }]}>{dados.organizacao.nome}</Text>
        <Text style={[TIPOGRAFIA.corpoPequeno, { color: cores.textoSuave }]}>Comissões desta organização das quais você participa.</Text>
        {dados.comissoes.length === 0 ? <EstadoVazio icone="people-outline" mensagem="Você ainda não participa de nenhuma comissão nesta organização." /> : null}
        {dados.comissoes.map((comissao) => <Cartao key={comissao._id} style={{ gap: ESPACO.sm }}>
          <Text style={[TIPOGRAFIA.subtitulo, { color: cores.texto }]}>{comissao.nome}</Text>
          {comissao.descricao ? <Text style={[TIPOGRAFIA.corpoPequeno, { color: cores.textoSuave }]}>{comissao.descricao}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm }}>
            <Etiqueta texto={comissao.ativo ? 'Ativa' : 'Inativa'} tom={comissao.ativo ? 'sucesso' : 'neutro'} />
            <Etiqueta texto={comissao.meu_papel === 'RESPONSAVEL' ? 'Responsável' : 'Membro'} tom="primaria" />
          </View>
        </Cartao>)}
      </View> : null}
    </TelaComCabecalho>
  );
}
