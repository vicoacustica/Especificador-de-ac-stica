// Superfícies do cenário para o traçado de raios: faces do modelo 3D com o α do material ligado
// a cada grupo, ou uma sala retangular de referência quando o projeto não tem modelo.
import { ehBase } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import { CATEGORIAS, type Cenario, type ModeloProjeto, type PorBanda, type Superficie, type TracadoRaios, type VistaRaios } from '../motor/tipos'
import { coresDoCenario } from '../importacao/cena'
import type { Ponto } from '../importacao/modelo'
import { cortar, eixoMaior, unir, type P2, type Plano, type Segmento } from './motor'

export interface FaceRaio { pontos: Ponto[]; alfa: PorBanda; nome: string; cor: string; chave: string; prioridade: number }

export interface CenaRaios {
  faces: FaceRaio[]
  eixo: P2
  min: Ponto
  max: Ponto
  /** Sala retangular de referência, sem modelo 3D. */
  caixa: boolean
}

/** α de quando a face não tem superfície ligada: alvenaria pintada. */
export const ALFA_SEM_MATERIAL: PorBanda = [0.02, 0.02, 0.02, 0.03, 0.04, 0.05]

const media = (lista: { alfa: PorBanda; area: number }[]): PorBanda => {
  const total = lista.reduce((s, x) => s + x.area, 0)
  if (!total) return ALFA_SEM_MATERIAL
  return [0, 1, 2, 3, 4, 5].map((i) => lista.reduce((s, x) => s + x.alfa[i] * x.area, 0) / total) as PorBanda
}

/** Medidas da sala de referência: proporção 3:2 em planta a partir do volume e do pé-direito. */
export function caixaPadrao(c: Cenario) {
  const areaPlanta = Math.max(c.volume / Math.max(c.peDireito, 1), 4)
  const largura = Math.sqrt(areaPlanta / 1.5)
  return { comprimento: +(largura * 1.5).toFixed(2), largura: +largura.toFixed(2) }
}

export function montarCena(cenario: Cenario, catalogo: Catalogo, modelo?: ModeloProjeto): CenaRaios {
  const alfaDe = (s?: Superficie): PorBanda => {
    if (!s) return ALFA_SEM_MATERIAL
    try { return catalogo.get(s.material).alfa } catch { return ALFA_SEM_MATERIAL }
  }
  if (modelo && Object.keys(cenario.grupos ?? {}).length) {
    const { cor, superficieDo } = coresDoCenario(cenario)
    const faces: FaceRaio[] = []
    for (const f of modelo.faces) {
      const pontos: Ponto[] = []
      for (let i = 0; i + 2 < f.p.length; i += 3) pontos.push([f.p[i], f.p[i + 1], f.p[i + 2]])
      if (pontos.length < 3) continue
      const s = superficieDo(f.g)
      faces.push({ pontos, alfa: alfaDe(s), nome: s?.nome ?? f.g, cor: cor(f.g), chave: f.g, prioridade: s && !CATEGORIAS[s.categoria].base ? 1 : 0 })
    }
    return { faces, eixo: eixoMaior(faces.map((f) => f.pontos)), ...limites(faces), caixa: false }
  }
  // Sem modelo: caixa com o α médio das superfícies de piso, paredes e teto (com o que está aplicado sobre elas).
  const { comprimento: L, largura: W } = cenario.raios?.caixa ?? caixaPadrao(cenario)
  const H = cenario.peDireito
  const porId = new Map(cenario.superficies.map((s) => [s.id, s]))
  const categoriaBase = (s: Superficie) => (ehBase(s) ? s.categoria : porId.get(s.base ?? '')?.categoria)
  const area = (s: Superficie) => (s.modo === 'dimensoes' ? (s.largura ?? 0) * (s.altura ?? 0) : s.area)
  const alfaCat = (cat: string) => media(cenario.superficies.filter((s) => categoriaBase(s) === cat).map((s) => ({ alfa: alfaDe(s), area: area(s) })))
  const cores = { piso: '#b8a48e', parede: '#7a6a58', teto: '#3d7ea6' }
  const face = (nome: string, cat: 'piso' | 'parede' | 'teto', pontos: Ponto[]): FaceRaio => ({ pontos, alfa: alfaCat(cat), nome, cor: cores[cat], chave: nome, prioridade: 0 })
  const faces = [
    face('Piso', 'piso', [[0, 0, 0], [L, 0, 0], [L, W, 0], [0, W, 0]]),
    face('Forro/teto', 'teto', [[0, 0, H], [L, 0, H], [L, W, H], [0, W, H]]),
    face('Parede 1', 'parede', [[0, 0, 0], [L, 0, 0], [L, 0, H], [0, 0, H]]),
    face('Parede 2', 'parede', [[L, 0, 0], [L, W, 0], [L, W, H], [L, 0, H]]),
    face('Parede 3', 'parede', [[L, W, 0], [0, W, 0], [0, W, H], [L, W, H]]),
    face('Parede 4', 'parede', [[0, W, 0], [0, 0, 0], [0, 0, H], [0, W, H]]),
  ]
  return { faces, eixo: [1, 0], min: [0, 0, 0], max: [L, W, H], caixa: true }
}

function limites(faces: FaceRaio[]) {
  const min: Ponto = [Infinity, Infinity, Infinity], max: Ponto = [-Infinity, -Infinity, -Infinity]
  for (const f of faces) for (const p of f.pontos) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]) }
  return { min, max }
}

/** Fonte no primeiro quarto do eixo maior e receptor no último, no meio da largura. */
export function posicoesPadrao(cena: CenaRaios): Pick<TracadoRaios, 'fonte' | 'receptor'> {
  const { min, max, eixo } = cena
  const centro: Ponto = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, min[2]]
  const ext = Math.abs((max[0] - min[0]) * eixo[0]) + Math.abs((max[1] - min[1]) * eixo[1])
  const h = max[2] - min[2]
  const ao = (f: number, z: number): Ponto => [+(centro[0] + eixo[0] * ext * f).toFixed(2), +(centro[1] + eixo[1] * ext * f).toFixed(2), +(min[2] + Math.min(z, h * 0.8)).toFixed(2)]
  return { fonte: ao(-0.3, 1.5), receptor: ao(0.25, 1.2) }
}

/** Segmentos da vista: faces cortadas pelo plano e elementos desenhados nela. */
export function segmentosDaVista(cena: CenaRaios, pl: Plano, vista: VistaRaios, raios: TracadoRaios, catalogo: Catalogo, corElemento: string): Segmento[] {
  const doModelo: Segmento[] = []
  for (const f of cena.faces) for (const [a, b] of cortar(pl, f.pontos)) doModelo.push({ a, b, alfa: f.alfa, nome: f.nome, cor: f.cor, chave: f.chave, prioridade: f.prioridade })
  const elementos: Segmento[] = raios.elementos.filter((e) => e.vista === vista).map((e, i) => {
    let alfa = ALFA_SEM_MATERIAL, nome = `Elemento ${i + 1}`
    try { const m = catalogo.get(e.material); alfa = m.alfa; nome = `Elemento ${i + 1} · ${m.nome}` } catch { /* material removido: α de alvenaria */ }
    return { a: e.a, b: e.b, alfa, nome, cor: corElemento, chave: e.id, elemento: true, prioridade: 2 }
  })
  return [...unir(doModelo), ...elementos]
}
