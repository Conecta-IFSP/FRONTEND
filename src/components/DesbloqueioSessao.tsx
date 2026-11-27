import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';

import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { FundoGradiente } from '@/components/FundoGradiente';
import { Logo } from '@/components/Logo';
import { TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/contexts/TemaContext';
import { autenticarComDispositivo, dispositivoProtegido } from '@/services/autenticacao-local';

type Props = {
  nome: string;
  aoLiberar: () => void;
  aoEntrarComSenha: () => Promise<void>;
};

/**
 * Pedido de biometria, Face ID ou PIN quando o app abre com uma sessão salva.
 * Aparelho sem nenhuma proteção (e a web) libera direto, como antes.
 */
export function DesbloqueioSessao({ nome, aoLiberar, aoEntrarComSenha }: Props) {
  const { cores } = useTema().tema;
  const { height: alturaTela } = useWindowDimensions();
  const [etapa, definirEtapa] = useState<'verificando' | 'falhou'>('verificando');
  const [saindo, definirSaindo] = useState(false);
  const pedindo = useRef(false);

  const pedir = useCallback(async () => {
    // Evita abrir dois pedidos do sistema ao mesmo tempo (ex.: efeito repetido em desenvolvimento).
    if (pedindo.current) return;
    pedindo.current = true;
    definirEtapa('verificando');
    try {
      if (!(await dispositivoProtegido())) {
        aoLiberar();
        return;
      }
      if (await autenticarComDispositivo().catch(() => false)) {
        aoLiberar();
        return;
      }
      definirEtapa('falhou');
    } finally {
      pedindo.current = false;
    }
  }, [aoLiberar]);

  useEffect(() => {
    void pedir();
  }, [pedir]);

  async function entrarComSenha() {
    definirSaindo(true);
    await aoEntrarComSenha();
  }

  if (etapa === 'verificando') return <Carregando rotulo="Confirmando sua identidade" />;

  return (
    <FundoGradiente
      marca={<Logo largura={alturaTela < 700 ? 100 : alturaTela < 800 ? 125 : 150} />}
      rodape={
        <Botao titulo="Entrar com senha" variante="secundario" aoTocar={() => void entrarComSenha()} carregando={saindo} />
      }
    >
      <Text style={[styles.titulo, { color: cores.texto }]}>Olá, {nome.split(' ')[0]}</Text>
      <Text style={[styles.texto, { color: cores.textoSuave }]}>
        Não foi possível confirmar sua identidade. Tente de novo com a biometria ou o PIN do aparelho, ou entre com
        sua senha.
      </Text>
      <Botao titulo="Tentar novamente" aoTocar={() => void pedir()} desabilitado={saindo} />
    </FundoGradiente>
  );
}

const styles = StyleSheet.create({
  titulo: { ...TIPOGRAFIA.titulo, textAlign: 'center' },
  texto: { ...TIPOGRAFIA.corpo, textAlign: 'center' },
});
