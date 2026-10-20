// Geometria do modelo 3D para os desenhos do memorial: pisos, forros e paredes agrupadas por plano,
// com o corte da planta baixa e as cotas de cada desenho.
import type { ModeloProjeto } from '../motor/tipos'
import { orientacao, type Ponto } from '../importacao/modelo'

export type P2 = [number, number]

export interface FacePlana { g: string; pontos: Ponto[] }

/** Paredes no mesmo plano vertical, vistas de dentro da sala. */
export interface Parede {
  /** Normal horizontal voltada para dentro da sala. */
  normal: P2
  /** Eixo horizontal da vista interna, da esquerda para a direita de quem olha a parede. */
  eixo: P2
  origem: P2
  faces: FacePlana[]
  /** Faixa ocupada no eixo (m), a partir da origem. */
  u: [number, number]
  z: [number, number]
}

export interface AnaliseModelo {
  min: Ponto
  max: Ponto
  pisos: FacePlana[]
  tetos: FacePlana[]
  paredes: Parede[]
  /** Altura do plano de corte da planta baixa (m). */
  zCorte: number
}

const TOL_PLANO = 0.15

function normalDe(p: Ponto[]): Ponto {
  let nx = 0, ny = 0, nz = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length]
    nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1])
  }
  const m = Math.hypot(nx, ny, nz) || 1
  return [nx / m, ny / m, nz / m]
}

const pontosDe = (p: number[]): Ponto[] => {
  const r: Ponto[] = []
  for (let i = 0; i + 2 < p.length; i += 3) r.push([p[i], p[i + 1], p[i + 2]])
  return r
}

/** Coordenadas da face na vista interna da parede: u no eixo, v na altura. */
export const naVista = (w: Parede, p: Ponto): P2 => [(p[0] - w.origem[0]) * w.eixo[0] + (p[1] - w.origem[1]) * w.eixo[1], p[2]]

export function analisarModelo(modelo: ModeloProjeto): AnaliseModelo {
  const faces = modelo.faces.map((f) => ({ g: f.g, pontos: pontosDe(f.p) })).filter((f) => f.pontos.length >= 3)
  const min: Ponto = [Infinity, Infinity, Infinity], max: Ponto = [-Infinity, -Infinity, -Infinity]
  for (const f of faces) for (const p of f.pontos) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]) }
  const zMeio = (min[2] + max[2]) / 2
  const centro: P2 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2]

  const pisos: FacePlana[] = [], tetos: FacePlana[] = []
  const verticais: { f: FacePlana; n: P2; d: number; ang: number }[] = []
  for (const f of faces) {
    const o = orientacao(f.pontos, zMeio)
    if (o === 'piso') pisos.push(f)
    else if (o === 'teto') tetos.push(f)
    else if (o === 'inclinada') {
      const zm = f.pontos.reduce((s, p) => s + p[2], 0) / f.pontos.length
      if (zm > zMeio) tetos.push(f)
    } else {
      const n3 = normalDe(f.pontos)
      const h = Math.hypot(n3[0], n3[1]) || 1
      let n: P2 = [n3[0] / h, n3[1] / h]
      const p0 = f.pontos[0]
      // A normal aponta para dentro da sala (para o centro da caixa envolvente).
      if (n[0] * (centro[0] - p0[0]) + n[1] * (centro[1] - p0[1]) < 0) n = [-n[0], -n[1]]
      const ang = Math.round((Math.atan2(n[1], n[0]) * 180) / Math.PI)
      verticais.push({ f, n, d: n[0] * p0[0] + n[1] * p0[1], ang: ang === -180 ? 180 : ang })
    }
  }

  // Agrupa as faces verticais por direção (1°) e por plano (até 15 cm de distância).
  const paredes: Parede[] = []
  const porAngulo = new Map<number, typeof verticais>()
  for (const v of verticais) porAngulo.set(v.ang, [...(porAngulo.get(v.ang) ?? []), v])
  for (const lista of porAngulo.values()) {
    lista.sort((a, b) => a.d - b.d)
    let atual: typeof verticais = []
    const fechar = () => {
      if (!atual.length) return
      const n = atual[0].n
      const eixo: P2 = [-n[1], n[0]]
      const w: Parede = { normal: n, eixo, origem: [0, 0], faces: atual.map((v) => v.f), u: [0, 0], z: [Infinity, -Infinity] }
      let uMin = Infinity, uMax = -Infinity
      for (const f of w.faces) for (const p of f.pontos) {
        const [u, z] = naVista(w, p)
        uMin = Math.min(uMin, u); uMax = Math.max(uMax, u)
        w.z = [Math.min(w.z[0], z), Math.max(w.z[1], z)]
      }
      // Origem no início da parede, sobre o plano dela: u vai de 0 ao comprimento.
      const d = atual.reduce((soma, v) => soma + v.d, 0) / atual.length
      w.origem = [n[0] * d + eixo[0] * uMin, n[1] * d + eixo[1] * uMin]
      w.u = [0, uMax - uMin]
      if (uMax - uMin > 0.05) paredes.push(w)
      atual = []
    }
    for (const v of lista) {
      if (atual.length && v.d - atual[atual.length - 1].d > TOL_PLANO) fechar()
      atual.push(v)
    }
    fechar()
  }
  // Ordem das vistas: pela direção da normal, girando no sentido anti-horário.
  paredes.sort((a, b) => Math.atan2(a.normal[1], a.normal[0]) - Math.atan2(b.normal[1], b.normal[0]))

  const altura = max[2] - min[2]
  return { min, max, pisos, tetos, paredes, zCorte: min[2] + Math.min(1.2, altura / 2) }
}

/** Trechos da face no plano de corte (z), como intervalos no eixo da parede. */
export function cortarFace(w: Parede, f: FacePlana, z: number): [number, number][] {
  const p = f.pontos.map((q) => naVista(w, q))
  const us: number[] = []
  for (let i = 0; i < p.length; i++) {
    const [ua, za] = p[i], [ub, zb] = p[(i + 1) % p.length]
    if ((za > z) !== (zb > z)) us.push(ua + ((z - za) / (zb - za)) * (ub - ua))
  }
  us.sort((a, b) => a - b)
  const r: [number, number][] = []
  for (let i = 0; i + 1 < us.length; i += 2) if (us[i + 1] - us[i] > 0.005) r.push([us[i], us[i + 1]])
  return r
}

/** Ponto da planta (x, y) de uma posição u ao longo da parede. */
export const naPlanta = (w: Parede, u: number): P2 => [w.origem[0] + w.eixo[0] * u, w.origem[1] + w.eixo[1] * u]

/** Valores distintos (1 cm) e ordenados, para as cadeias de cotas. */
export function marcos(valores: number[], tol = 0.01): number[] {
  const v = [...valores].sort((a, b) => a - b)
  const r: number[] = []
  for (const x of v) if (!r.length || x - r[r.length - 1] > tol) r.push(x)
  return r
}

export function centroide(p: P2[]): P2 {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length]
    const k = x0 * y1 - x1 * y0
    a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k
  }
  if (Math.abs(a) < 1e-12) return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]
  return [cx / (3 * a), cy / (3 * a)]
}

export function areaPoligono(p: P2[]): number {
  let a = 0
  for (let i = 0; i < p.length; i++) { const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length]; a += x0 * y1 - x1 * y0 }
  return Math.abs(a) / 2
}
