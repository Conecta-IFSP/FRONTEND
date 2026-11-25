import { ManualPdf } from '@/components/ManualPdf';
import { TelaComCabecalho } from '@/components/TelaComCabecalho';

/** Manual do usuário embutido no app (offline). Abre com ou sem login, como a Ajuda. */
export default function TelaManual() {
  return (
    <TelaComCabecalho titulo="Manual de utilização" rolagem={false} divisor>
      <ManualPdf />
    </TelaComCabecalho>
  );
}
