/** Sugestões locais de conveniência, sem consulta à disponibilidade dos convidados. */
export function sugerirHorarios(dia: Date, agora: Date, inicio?: number): string[] {
  let minutos: number[];
  if (inicio !== undefined) {
    minutos = [30, 60, 90, 120, 180].map((duracao) => inicio + duracao);
  } else if (dia.toDateString() === agora.toDateString()) {
    const proximo = Math.ceil((agora.getHours() * 60 + agora.getMinutes() + 1) / 30) * 30;
    minutos = Array.from({ length: 6 }, (_, i) => proximo + i * 30);
  } else {
    minutos = [8, 9, 10, 11, 14, 15, 16, 17, 18].map((hora) => hora * 60);
  }
  return minutos.filter((m) => m >= 0 && m < 1440).map((m) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
  );
}
