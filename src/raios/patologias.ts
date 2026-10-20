// Reflexões que podem prejudicar a audição, pelos critérios usuais da literatura:
// eco (Haas, 1951; Kuttruff, Room Acoustics, 2009), eco palpitante entre superfícies paralelas
// (Long, Architectural Acoustics, 2014) e coloração por reflexões muito próximas do som direto
// (Everest e Pohlmann, Master Handbook of Acoustics, 2015). São indicações de atenção, não veredictos.
import { C_SOM, type Reflexao, type Segmento } from './motor'

export type Patologia = 'eco' | 'palpitante' | 'coloracao'

export const PATOLOGIAS: Record<Patologia, { nome: string; sigla: string; criterio: string }> = {
  eco: {
    nome: 'Eco potencial',
    sigla: 'E',
    criterio: 'Reflexão que chega mais de 50 ms depois do som direto (diferença de percurso acima de 17 m) com nível de até 10 dB abaixo dele. Para a fala o ouvido deixa de somar a reflexão ao som direto depois de cerca de 50 ms (efeito de precedência, ou efeito Haas); para a música, depois de cerca de 80 ms.',
  },
  palpitante: {
    nome: 'Eco palpitante',
    sigla: 'P',
    criterio: 'Reflexão que vai e volta entre duas superfícies paralelas e refletoras (α abaixo de 0,20). O som se repete a cada 2d/c e soa como um “tremido” ou zumbido (flutter echo).',
  },
  coloracao: {
    nome: 'Coloração',
    sigla: 'C',
    criterio: 'Reflexão forte (até 6 dB abaixo do som direto) que chega até 5 ms depois dele. A soma com o som direto reforça e cancela frequências alternadas (filtro pente) e altera o timbre.',
  },
}

const ALFA_REFLETOR = 0.2

const direcao = (s: Segmento) => {
  const ex = s.b[0] - s.a[0], ey = s.b[1] - s.a[1]
  const L = Math.hypot(ex, ey) || 1
  return [ex / L, ey / L] as const
}
const paralelos = (a: Segmento, b: Segmento) => {
  const [ax, ay] = direcao(a), [bx, by] = direcao(b)
  return Math.abs(ax * by - ay * bx) < Math.sin((3 * Math.PI) / 180)
}

export interface ParParalelo {
  a: number
  b: number
  /** Distância entre as superfícies (m). */
  distancia: number
  /** Período de repetição do eco palpitante, 2d/c (ms). */
  periodo: number
}

/** Pares de superfícies paralelas, refletoras na banda e frente a frente (projeções que se sobrepõem). */
export function paresParalelos(segs: Segmento[], banda: number): ParParalelo[] {
  const r: ParParalelo[] = []
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const A = segs[i], B = segs[j]
      if (A.alfa[banda] >= ALFA_REFLETOR || B.alfa[banda] >= ALFA_REFLETOR || !paralelos(A, B)) continue
      const [dx, dy] = direcao(A)
      const n = [-dy, dx]
      const distancia = Math.abs((B.a[0] - A.a[0]) * n[0] + (B.a[1] - A.a[1]) * n[1])
      if (distancia < 1.5) continue
      const t = (p: readonly number[]) => p[0] * dx + p[1] * dy
      const sobreposicao = Math.min(Math.max(t(A.a), t(A.b)), Math.max(t(B.a), t(B.b))) - Math.max(Math.min(t(A.a), t(A.b)), Math.min(t(B.a), t(B.b)))
      if (sobreposicao < 0.5) continue
      r.push({ a: i, b: j, distancia, periodo: ((2 * distancia) / C_SOM) * 1000 })
    }
  }
  return r.sort((x, y) => y.distancia - x.distancia)
}

export function patologiasDa(r: Reflexao, segs: Segmento[], banda: number): Patologia[] {
  const p: Patologia[] = []
  if (r.atraso > 50 && r.nivel >= -10) p.push('eco')
  // Vai e volta: a mesma superfície aparece de novo depois de bater em uma paralela a ela.
  const s = r.superficies
  for (let k = 0; k + 2 < s.length; k++) {
    const A = segs[s[k]], B = segs[s[k + 1]]
    if (s[k + 2] === s[k] && paralelos(A, B) && A.alfa[banda] < ALFA_REFLETOR && B.alfa[banda] < ALFA_REFLETOR) { p.push('palpitante'); break }
  }
  if (!p.includes('palpitante') && s.length === 2 && paralelos(segs[s[0]], segs[s[1]]) && segs[s[0]].alfa[banda] < ALFA_REFLETOR && segs[s[1]].alfa[banda] < ALFA_REFLETOR && r.nivel >= -10) p.push('palpitante')
  if (r.atraso <= 5 && r.nivel >= -6) p.push('coloracao')
  return p
}
