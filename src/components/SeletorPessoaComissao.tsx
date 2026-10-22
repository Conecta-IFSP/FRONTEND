import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { Avatar } from './Avatar';
import { Botao } from './Botao';
import { CampoTexto } from './CampoTexto';
import { FolhaInferior } from './FolhaInferior';
import { ESPACO, FONTES } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import type { PessoaComissao } from '@/services/api';

type SeletorPessoaComissaoProps = {
  visivel: boolean;
  titulo: string;
  pessoas: PessoaComissao[];
  selecionados: string[];
  aoAlternar: (id: string) => void;
  aoFechar: () => void;
  multiplo?: boolean;
  fixos?: string[];
  usuarioId?: string;
  aoMarcarTodos?: (todos: boolean) => void;
};

export function SeletorPessoaComissao({
  visivel,
  titulo,
  pessoas,
  selecionados,
  aoAlternar,
  aoFechar,
  multiplo = false,
  fixos = [],
  usuarioId,
  aoMarcarTodos,
}: SeletorPessoaComissaoProps) {
  const { cores } = useTema().tema;
  const [busca, definirBusca] = useState('');
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const lista = pessoas.filter((pessoa) =>
    `${pessoa.nome} ${pessoa.email}`.toLocaleLowerCase('pt-BR').includes(termo),
  );
  const todos = pessoas.length > 0 && pessoas.every((pessoa) => selecionados.includes(pessoa._id));

  function fechar() {
    definirBusca('');
    aoFechar();
  }

  function marcador(marcado: boolean, bloqueado: boolean) {
    const nome = multiplo
      ? marcado ? 'checkbox' : 'square-outline'
      : marcado ? 'radio-button-on' : 'radio-button-off';
    return (
      <Ionicons
        name={nome}
        size={22}
        color={bloqueado ? cores.textoSutil : marcado ? cores.primaria : cores.textoSutil}
      />
    );
  }

  return (
    <FolhaInferior
      visivel={visivel}
      titulo={titulo}
      aoFechar={fechar}
      acompanharTeclado
      topo={
        pessoas.length > 6 ? (
          <CampoTexto
            rotulo="Buscar"
            placeholder="Nome ou e-mail"
            icone="search-outline"
            value={busca}
            onChangeText={definirBusca}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            compacto
          />
        ) : undefined
      }
    >
      {multiplo && aoMarcarTodos && !termo ? (
        <Pressable
          onPress={() => aoMarcarTodos(!todos)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: todos }}
          style={({ pressed }) => [styles.linha, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.iconeTodos, { backgroundColor: cores.primariaSuave }]}>
            <Ionicons name="people-outline" size={20} color={cores.primaria} />
          </View>
          <Text style={[styles.nome, styles.textos, { color: cores.texto }]}>Toda a comissão</Text>
          {marcador(todos, false)}
        </Pressable>
      ) : null}

      {lista.map((pessoa) => {
        const bloqueado = fixos.includes(pessoa._id);
        const marcado = bloqueado || selecionados.includes(pessoa._id);
        return (
          <Pressable
            key={pessoa._id}
            onPress={() => {
              if (bloqueado) return;
              aoAlternar(pessoa._id);
              if (!multiplo) fechar();
            }}
            disabled={bloqueado}
            accessibilityRole={multiplo ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: marcado, disabled: bloqueado }}
            accessibilityLabel={`${pessoa.nome}, ${pessoa.email}`}
            style={({ pressed }) => [
              styles.linha,
              { borderTopColor: cores.bordaSuave, borderTopWidth: 1, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Avatar nome={pessoa.nome} colorido />
            <View style={styles.textos}>
              <Text style={[styles.nome, { color: cores.texto }]} numberOfLines={1}>
                {pessoa.nome}
                {pessoa._id === usuarioId ? ' (você)' : ''}
              </Text>
              <Text style={[styles.email, { color: cores.textoSuave }]} numberOfLines={1}>
                {pessoa.email}
              </Text>
            </View>
            {marcador(marcado, bloqueado)}
          </Pressable>
        );
      })}

      {lista.length === 0 ? (
        <Text style={[styles.vazio, { color: cores.textoSuave }]}>Ninguém encontrado.</Text>
      ) : null}

      {multiplo ? (
        <View style={styles.rodape}>
          <Botao titulo="Concluir" pilula aoTocar={fechar} />
        </View>
      ) : null}
    </FolhaInferior>
  );
}

const styles = StyleSheet.create({
  linha: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md - 4,
    paddingHorizontal: ESPACO.md,
    paddingVertical: ESPACO.sm,
  },
  iconeTodos: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0 },
  nome: { fontFamily: FONTES.corpoMedio, fontSize: 15, lineHeight: 22 },
  email: { fontFamily: FONTES.corpo, fontSize: 13, lineHeight: 18 },
  vazio: { fontFamily: FONTES.corpo, fontSize: 14, lineHeight: 20, padding: ESPACO.md },
  rodape: { paddingHorizontal: ESPACO.md, paddingTop: ESPACO.sm },
});
