// Dados da resposta ao impulso de um cenário: tempo de reverberação e absorção do cálculo, e reflexões
// especulares do traçado de raios (planta e corte longitudinal) com a fonte e o receptor da etapa 6.
import { calcular } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import { BANDAS, type Cenario, type EstadoOcupacao, type ModeloProjeto, type PorBanda } from '../motor/tipos'
import { montarCena, posicoesPadrao, segmentosDaVista } from '../raios/cena'
import { planoDa, projetar, reflexoes, type Segmento } from '../raios/motor'
import type { DadosRI, ReflexaoRI } from './ri'

const ORDEM = 3
const ATRASO_MAX = 150

/** Segmento quase vertical no corte: parede, que já aparece na planta. */
const vertical = (s: Segmento) => Math.abs(s.b[0] - s.a[0]) < 0.15 * Math.abs(s.b[1] - s.a[1])

export function dadosDoCenario(c: Cenario, catalogo: Catalogo, modelo: ModeloProjeto | undefined, estado: EstadoOcupacao, fs: number): DadosRI {
  const r = calcular(c, catalogo)
  const cena = montarCena(c, catalogo, modelo)
  const raios = c.raios ?? { ...posicoesPadrao(cena), elementos: [] }
  const f = raios.fonte, rc = raios.receptor
  const distancia = Math.max(0.3, Math.hypot(rc[0] - f[0], rc[1] - f[1], rc[2] - f[2]))
  const lista: ReflexaoRI[] = []
  for (const vista of ['planta', 'longitudinal'] as const) {
    const pl = planoDa(vista, f, cena.eixo)
    const segs = segmentosDaVista(cena, pl, vista, raios, catalogo, '')
    const pf = projetar(pl, f), pr = projetar(pl, rc)
    // Distância fora do plano entre fonte e receptor: completa o percurso em 3D.
    const fora = Math.abs((rc[0] - f[0]) * pl.n[0] + (rc[1] - f[1]) * pl.n[1] + (rc[2] - f[2]) * pl.n[2])
    for (const x of reflexoes(segs, pf, pr, ORDEM, 3, ATRASO_MAX).lista) {
      // No corte ficam só as reflexões que passam por piso, teto ou superfícies inclinadas; as de paredes vêm da planta.
      if (vista === 'longitudinal' && x.superficies.every((i) => vertical(segs[i]))) continue
      const percurso = Math.hypot(x.percurso, fora)
      const ganhos = BANDAS.map((_, b) => (distancia / percurso) * Math.sqrt(x.superficies.reduce((p, i) => p * Math.max(1 - segs[i].alfa[b], 0), 1))) as PorBanda
      const atraso = (percurso - distancia) / 343
      if (atraso > 0) lista.push({ atraso, ganhos })
    }
  }
  const pe = r.porEstado[estado]
  return { tempos: r.tempo[estado], absorcao: pe.absorcao, alfa: pe.alfa, distancia, reflexoes: lista, fs }
}
