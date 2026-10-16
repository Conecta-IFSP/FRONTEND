import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, useWatch } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { FaixaAviso } from '@/components/FaixaAviso';
import { Opcao } from '@/components/Opcao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { api, type Comissao } from '@/services/api';
import { TAMANHO_MAXIMO_DESCRICAO, validarDescricao, validarNomeComissao } from '@/utils/validacao';

type DadosComissao = { organizacao_id: string; nome: string; descricao: string };

export default function TelaNovaComissao() {
  const router = useRouter();
  const { cores } = useTema().tema;
  const { organizacao_id: organizacaoInicial } = useLocalSearchParams<{ organizacao_id?: string }>();
  const [organizacoes, definirOrganizacoes] = useState<{ _id: string; nome: string }[]>([]);
  const { control, handleSubmit, setValue, formState } = useForm<DadosComissao>({
    defaultValues: { organizacao_id: '', nome: '', descricao: '' },
  });
  const organizacaoId = useWatch({ control, name: 'organizacao_id' });
  const descricao = useWatch({ control, name: 'descricao' });
  const salvando = formState.isSubmitting;
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(true);

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
      setValue(
        'organizacao_id',
        resultado.dados.find((org) => org._id === organizacaoInicial)?._id ??
          resultado.dados[0]?._id ??
          '',
      );
    });

    return () => {
      ativa = false;
    };
  }, [organizacaoInicial, setValue]);

  const salvar = handleSubmit(async (dados) => {
    definirErro('');
    const resultado = await api<Comissao>('/comissoes', 'POST', {
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      organizacao_id: dados.organizacao_id,
    });

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    router.replace({
      pathname: '/comissoes/[id]',
      params: { id: resultado.dados._id, criada: '1' },
    });
  });

  return (
    <TelaComCabecalho titulo="Nova comissão">
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {carregando ? <Carregando rotulo="Carregando organizações" /> : null}

      {!carregando && organizacoes.length === 0 ? (
        <EstadoVazio
          icone="business-outline"
          mensagem="Você não administra nenhuma organização aprovada."
        />
      ) : null}

      {!carregando && organizacoes.length > 0 ? (
        <>
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
                    aoTocar={() => setValue('organizacao_id', org._id)}
                    style={styles.opcao}
                  />
                ))}
              </View>
            </View>

            <CampoTextoControlado
              controle={control}
              nome="nome"
              validar={validarNomeComissao}
              rotulo="Nome da comissão *"
              icone="people-outline"
              maxLength={100}
              editable={!salvando}
            />

            <CampoTextoControlado
              controle={control}
              nome="descricao"
              validar={validarDescricao}
              rotulo="Descrição (opcional)"
              icone="document-text-outline"
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
              aoTocar={() => void salvar()}
            />
          </Cartao>
        </>
      ) : null}
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: ESPACO.md },
  rotulo: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  opcao: { maxWidth: '100%' },
});
