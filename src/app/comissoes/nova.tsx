import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { Botao } from '@/components/Botao';
import { CampoSelecao, CampoTextoControlado } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { Cartao } from '@/components/Cartao';
import { EstadoVazio } from '@/components/EstadoVazio';
import { FaixaAviso } from '@/components/FaixaAviso';
import { Opcao } from '@/components/Opcao';
import { SeletorPessoaComissao } from '@/components/SeletorPessoaComissao';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';
import { ESPACO, FONTES, TIPOGRAFIA } from '@/constants/theme';
import { useSessao } from '@/contexts/SessaoContext';
import { useTema } from '@/contexts/TemaContext';
import { api, type Comissao, type PessoaComissao } from '@/services/api';
import { TAMANHO_MAXIMO_DESCRICAO, validarDescricao, validarNomeComissao } from '@/utils/validacao';

type DadosComissao = { organizacao_id: string; responsavel_id: string; nome: string; descricao: string };

export default function TelaNovaComissao() {
  const router = useRouter();
  const { cores } = useTema().tema;
  const { usuario } = useSessao();
  const { organizacao_id: organizacaoInicial } = useLocalSearchParams<{ organizacao_id?: string }>();
  const [organizacoes, definirOrganizacoes] = useState<{ _id: string; nome: string }[]>([]);
  const { control, handleSubmit, setValue, formState } = useForm<DadosComissao>({
    defaultValues: { organizacao_id: '', responsavel_id: '', nome: '', descricao: '' },
  });
  const organizacaoId = useWatch({ control, name: 'organizacao_id' });
  const descricao = useWatch({ control, name: 'descricao' });
  const salvando = formState.isSubmitting;
  const [candidatos, definirCandidatos] = useState<{ organizacao: string; pessoas: PessoaComissao[] }>({
    organizacao: '',
    pessoas: [],
  });
  const [seletor, definirSeletor] = useState(false);
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(true);
  const carregandoPessoas = Boolean(organizacaoId && candidatos.organizacao !== organizacaoId);
  const pessoas = candidatos.organizacao === organizacaoId ? candidatos.pessoas : [];

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
        resultado.dados.find((org) => org._id === organizacaoInicial)?._id ?? resultado.dados[0]?._id ?? '',
      );
    });

    return () => {
      ativa = false;
    };
  }, [organizacaoInicial, setValue]);

  useEffect(() => {
    let ativa = true;
    setValue('responsavel_id', '');
    if (!organizacaoId) return;
    void api<PessoaComissao[]>(`/comissoes/organizacoes/${organizacaoId}/membros`).then((resposta) => {
      if (!ativa) return;
      definirCandidatos({ organizacao: organizacaoId, pessoas: resposta.ok ? resposta.dados : [] });
      if (!resposta.ok) definirErro(resposta.erro);
    });
    return () => {
      ativa = false;
    };
  }, [organizacaoId, setValue]);

  const salvar = handleSubmit(async (dados) => {
    definirErro('');
    const resultado = await api<Comissao>('/comissoes', 'POST', {
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      organizacao_id: dados.organizacao_id,
      responsavel_id: dados.responsavel_id,
    });

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }

    router.replace({ pathname: '/comissoes/[id]', params: { id: resultado.dados._id, criada: '1' } });
  });

  return (
    <TelaComCabecalho titulo="Nova comissão">
      {erro ? <FaixaAviso aviso={{ tom: 'erro', mensagem: erro }} /> : null}
      {carregando ? <Carregando rotulo="Carregando organizações" /> : null}

      {!carregando && organizacoes.length === 0 ? (
        <EstadoVazio icone="business-outline" mensagem="Você não administra nenhuma organização aprovada." />
      ) : null}

      {!carregando && organizacoes.length > 0 ? (
        <Cartao style={styles.cartao}>
          <View>
            <Text style={[styles.rotulo, { color: cores.textoSuave }]}>Organização</Text>
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
            rotulo="Nome da comissão"
            placeholder="Comissão"
            icone="people-outline"
            maxLength={100}
            editable={!salvando}
          />

          <CampoTextoControlado
            controle={control}
            nome="descricao"
            validar={validarDescricao}
            rotulo="Descrição (opcional)"
            placeholder="Descrição"
            icone="document-text-outline"
            dica={`${descricao.length}/${TAMANHO_MAXIMO_DESCRICAO}`}
            maxLength={TAMANHO_MAXIMO_DESCRICAO}
            multiline
            editable={!salvando}
          />

          <Controller
            control={control}
            name="responsavel_id"
            rules={{ required: 'Selecione o responsável' }}
            render={({ field, fieldState }) => (
              <View>
                <CampoSelecao
                  rotulo="Responsável"
                  valor={pessoas.find((pessoa) => pessoa._id === field.value)?.nome ?? 'Selecionar'}
                  icone="person-outline"
                  desabilitado={salvando || carregandoPessoas || pessoas.length === 0}
                  aoTocar={() => definirSeletor(true)}
                />
                {fieldState.error ? (
                  <Text accessibilityRole="alert" style={[styles.erro, { color: cores.erro }]}>
                    {fieldState.error.message}
                  </Text>
                ) : null}
                <SeletorPessoaComissao
                  visivel={seletor}
                  titulo="Responsável"
                  pessoas={pessoas}
                  selecionados={field.value ? [field.value] : []}
                  usuarioId={usuario?._id}
                  aoAlternar={field.onChange}
                  aoFechar={() => definirSeletor(false)}
                />
              </View>
            )}
          />

          <Botao
            titulo="Cadastrar comissão"
            tituloCarregando="Salvando..."
            icone="checkmark"
            carregando={salvando}
            desabilitado={carregandoPessoas}
            aoTocar={() => void salvar()}
          />
        </Cartao>
      ) : null}
    </TelaComCabecalho>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: ESPACO.md },
  rotulo: { ...TIPOGRAFIA.rotulo, marginBottom: ESPACO.sm },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO.sm },
  opcao: { maxWidth: '100%' },
  erro: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18, marginTop: ESPACO.xs },
});
