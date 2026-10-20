// Critérios de projeto: DIN 18041 (grupos A e B) e NBR 12179 com as margens da DIN 18041.
import type { Criterio, CurvaNBR, GrupoA, GrupoB, PorBanda } from './tipos'

/** Normas com o ano de publicação, como aparecem nos textos. */
export const DIN = 'DIN 18041:2016'
export const NBR = 'NBR 12179:1992'

export const GRUPOS_A: Record<GrupoA, { uso: string; exemplos: string; volumeMin: number; volumeMax: number }> = {
  A1: { uso: 'Música', exemplos: 'Salas de música e de ensaio', volumeMin: 30, volumeMax: 1000 },
  A2: { uso: 'Fala e palestra', exemplos: 'Auditórios, salas de palestra, tribunais, plenários', volumeMin: 50, volumeMax: 5000 },
  A3: { uso: 'Ensino e comunicação', exemplos: 'Salas de aula, salas de reunião, videoconferência', volumeMin: 30, volumeMax: 5000 },
  A4: { uso: 'Ensino e comunicação inclusivos', exemplos: 'Salas de aula para pessoas com deficiência auditiva ou de idioma estrangeiro', volumeMin: 30, volumeMax: 500 },
  A5: { uso: 'Esporte', exemplos: 'Ginásios, quadras e piscinas', volumeMin: 200, volumeMax: Infinity },
}

export const GRUPOS_B: Record<GrupoB, { uso: string; exemplos: string; constante: number; minimoAte2_5m: number }> = {
  B2: { uso: 'Permanência curta', exemplos: 'Circulações, halls, escadas', constante: 4.8, minimoAte2_5m: 0.15 },
  B3: { uso: 'Permanência longa', exemplos: 'Salas de espera, lojas, bibliotecas', constante: 3.13, minimoAte2_5m: 0.2 },
  B4: { uso: 'Necessidade de redução de ruído', exemplos: 'Escritórios abertos, atendimento, consultórios', constante: 2.13, minimoAte2_5m: 0.25 },
  B5: { uso: 'Grande necessidade de redução de ruído', exemplos: 'Restaurantes, refeitórios, creches', constante: 1.47, minimoAte2_5m: 0.3 },
}

// NBR 12179 (1992), Figura 1: curvas digitalizadas e ajustadas como T = a + b·lg V + c·(lg V)².
export const CURVAS_NBR: Record<CurvaNBR, { usos: string; exemplos: string; coef: [number, number, number]; volumeMin: number; volumeMax: number }> = {
  igreja: { usos: 'Igreja católica, música de órgão', exemplos: 'Igrejas católicas', coef: [0.57, 0.1264, 0.0582], volumeMin: 30, volumeMax: 30000 },
  concerto: { usos: 'Sala de concerto, igreja protestante, sinagoga', exemplos: 'Salas de concerto, igrejas protestantes', coef: [0.6207, -0.1112, 0.092], volumeMin: 280, volumeMax: 30000 },
  musica: { usos: 'Ópera, estúdio de rádio para música', exemplos: 'Estúdios de gravação de música', coef: [0.3802, -0.0107, 0.0731], volumeMin: 80, volumeMax: 30000 },
  conferencia: { usos: 'Sala de conferência, cinema', exemplos: 'Cinemas, home theaters, salas de conferência', coef: [0.1002, 0.1396, 0.0282], volumeMin: 30, volumeMax: 30000 },
  palavra: { usos: 'Estúdio de rádio para palavra', exemplos: 'Estúdios de rádio para voz', coef: [-0.0567, 0.1712, 0.0284], volumeMin: 30, volumeMax: 700 },
}

/** Tempo alvo (s) da DIN 18041, grupo A. */
export function tempoAlvo(grupo: GrupoA, volume: number): number {
  const lg = Math.log10(volume)
  switch (grupo) {
    case 'A1': return 0.45 * lg + 0.07
    case 'A2': return 0.37 * lg - 0.14
    case 'A3': return 0.32 * lg - 0.17
    case 'A4': return 0.26 * lg - 0.14
    case 'A5': return Math.min(0.75 * lg - 1.0, 2.0)
  }
}

/** Tempo ótimo (s) a 500 Hz da NBR 12179. */
export function tempoOtimoNBR(curva: CurvaNBR, volume: number): number {
  const [a, b, c] = CURVAS_NBR[curva].coef
  const lg = Math.log10(volume)
  return a + b * lg + c * lg * lg
}

/** A/V mínimo (m²/m³) da DIN 18041, grupo B, para o pé-direito h (m). */
export function avMinimo(grupo: GrupoB, altura: number): number {
  const { constante, minimoAte2_5m } = GRUPOS_B[grupo]
  return altura <= 2.5 ? minimoAte2_5m : 1 / (constante + 4.69 * Math.log10(altura))
}

/** Fatores da faixa de tolerância por banda (DIN 18041). */
export const TOLERANCIA_SUPERIOR: PorBanda = [1.45, 1.2, 1.2, 1.2, 1.2, 1.2]
export const TOLERANCIA_INFERIOR: PorBanda = [0.65, 0.8, 0.8, 0.8, 0.8, 0.65]

/** Bandas avaliadas no grupo B: 250 a 2000 Hz. */
export const BANDAS_GRUPO_B = [1, 2, 3, 4]

export type MetaCriterio =
  | { tipo: 'tempo'; nome: string; t: number; superior: PorBanda; inferior: PorBanda; foraDaFaixa: boolean; faixaVolume: string; otimo: boolean }
  | { tipo: 'absorcao'; nome: string; avMinimo: number }

export function metaDoCriterio(criterio: Criterio, volume: number, peDireito: number): MetaCriterio {
  const faixa = (t: number) => ({
    superior: TOLERANCIA_SUPERIOR.map((f) => f * t) as PorBanda,
    inferior: TOLERANCIA_INFERIOR.map((f) => f * t) as PorBanda,
  })
  if (criterio.norma === 'A') {
    const g = GRUPOS_A[criterio.grupo]
    const t = tempoAlvo(criterio.grupo, volume)
    return {
      tipo: 'tempo', nome: `${DIN}, grupo ${criterio.grupo} (${g.uso})`, t, ...faixa(t), otimo: false,
      foraDaFaixa: volume < g.volumeMin || volume > g.volumeMax,
      faixaVolume: `${g.volumeMin} a ${g.volumeMax === Infinity ? '∞' : g.volumeMax} m³`,
    }
  }
  if (criterio.norma === 'NBR') {
    const c = CURVAS_NBR[criterio.curva]
    const t = tempoOtimoNBR(criterio.curva, volume)
    return {
      tipo: 'tempo', nome: `${NBR} (${c.usos}), margens da ${DIN}`, t, ...faixa(t), otimo: true,
      foraDaFaixa: volume < c.volumeMin || volume > c.volumeMax,
      faixaVolume: `${c.volumeMin} a ${c.volumeMax} m³`,
    }
  }
  return { tipo: 'absorcao', nome: `${DIN}, grupo ${criterio.grupo} (${GRUPOS_B[criterio.grupo].uso})`, avMinimo: avMinimo(criterio.grupo, peDireito) }
}
