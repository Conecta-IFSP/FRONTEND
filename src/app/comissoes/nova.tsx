/** Cadastro de uma nova comissão dentro de uma organização administrada. */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { FaixaAviso } from '@/components/FaixaAviso';
import { Opcao } from '@/components/Opcao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api, type Comissao } from '@/services/api';
import { TAMANHO_MAXIMO_DESCRICAO } from '@/utils/validacao';

export default function TelaNovaComissao() {
  const router = useRouter();
  const { cores } = useTema().tema;
  /** Organização de onde a tela foi aberta; ela já vem escolhida, mas pode ser trocada. */
  const { organizacao_id: organizacaoInicial } = useLocalSearchParams<{ organizacao_id?: string }>();
  const [organizacoes, definirOrganizacoes] = useState<{ _id: string; nome: string }[]>([]);
  const [organizacaoId, definirOrganizacaoId] = useState('');
  const [nome, definirNome] = useState('');
  const [descricao, definirDescricao] = useState('');
  const [erroNome, definirErroNome] = useState<string | null>(null);
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(true);
  const [salvando, definirSalvando] = useState(false);

  useEffect(() => {
    let ativa = true;

    void api<{ _id: string; nome: string }[]>('/comissoes/organizacoes').then((resultado) => {
      if (!ativa) return;
      definirCarregando(false);
      if (!resultado.ok) {
        definirErro(resultado.erro);
        return;
      }
      definirOrganizacoes(resultado.dados);
      definirOrganizacaoId(
        resultado.dados.find((org) => org._id === organizacaoInicial)?._id ??
          resultado.dados[0]?._id ??
          '',
      );
    });

    return () => {
      ativa = false;
    };
  }, [organizacaoInicial]);

  async function salvar() {
    if (nome.trim().length < 2) {
      definirErroNome('Informe um nome com pelo menos 2 caracteres.');
      return;
    }
    definirErroNome(null);
    if (salvando) return;

    definirSalvando(true);
    definirErro('');
    const resultado = await api<Comissao>('/comissoes', 'POST', {
      nome: nome.trim(),
      descricao: descricao.trim(),
      organizacao_id: organizacaoId,
    });
    definirSalvando(false);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    router.replace({
      pathname: '/comissoes/[id]',
      params: { id: resultado.dados._id, criada: '1' },
    });
  }

  return (
    <TelaComCabecalho titulo="Nova comissão">
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {carregando ? <Carregando rotulo="Carregando organizações" /> : null}

      {!carregando && organizacoes.length === 0 ? (
        <EstadoVazio
          icone="business-outline"
          mensagem="Nenhuma organização disponível. É necessário ser administrador aprovado de uma organização autorizada."
        />
      ) : null}

      {!carregando && organizacoes.length > 0 ? (
        <>
          <Text style={[styles.introducao, { color: cores.textoSuave }]}>
            Selecione a organização e informe os dados da comissão. Depois de salvar, você poderá
            montar a equipe.
          </Text>

          <Cartao style={styles.cartao}>
            <View>
              <Text style={[styles.rotulo, { color: cores.textoSuave }]}>Organização *</Text>
              <View style={styles.opcoes}>
                {organizacoes.map((org) => (
                  <Opcao
                    key={org._id}
                    titulo={org.nome}
                    selecionado={org._id === organizacaoId}
                    desabilitado={salvando}
                    aoTocar={() => definirOrganizacaoId(org._id)}
                    style={styles.opcao}
                  />
                ))}
              </View>
            </View>

            <CampoTexto
              rotulo="Nome da comissão *"
              icone="people-outline"
              placeholder="Ex.: Comissão de eventos"
              value={nome}
              onChangeText={(valor) => {
                definirNome(valor);
                definirErroNome(null);
              }}
              erro={erroNome}
              maxLength={100}
              editable={!salvando}
            />

            <CampoTexto
              rotulo="Descrição (opcional)"
              icone="document-text-outline"
              placeholder="Descreva o objetivo da comissão"
              value={descricao}
              onChangeText={definirDescricao}
              dica={`${descricao.length}/${TAMANHO_MAXIMO_DESCRICAO}`}
              maxLength={TAMANHO_MAXIMO_DESCRICAO}
              multiline
              editable={!salvando}
            />

            <Botao
              titulo="Cadastrar comissão"
              tituloCarregando="Salvando..."
              icone="checkmark"
              carregando={salvando}
              aoTocar={salvar}
            />
          </Cartao>
        </>
      ) : null}
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  introducao: { ...TIPOGRAFIA.corpoPequeno },
  cartao: { gap: ESPACO.md },
  rotulo: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  opcao: { maxWidth: '100%' },
});
