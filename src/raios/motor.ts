// Traçado de raios em 2D: a planta baixa e os cortes viram segmentos com a absorção (α) de cada superfície.
// O leque de raios mostra como o som se espalha; as fontes-imagem dão as reflexões especulares exatas
// entre a fonte e o receptor, com o tempo de atraso e o nível em relação ao som direto.
import type { PorBanda } from '../motor/tipos'
import type { Ponto } from '../importacao/modelo'

export type P2 = [number, number]
export type Vista = 'planta' | 'longitudinal' | 'transversal'

export const NOME_VISTA: Record<Vista, string> = { planta: 'Planta baixa', longitudinal: 'Corte longitudinal', transversal: 'Corte transversal' }

/** Velocidade do som no ar a 20 °C, em m/s. */
export const C_SOM = 343

export interface Segmento {
  a: P2
  b: P2
  alfa: PorBanda
  nome: string
  cor: string
  /** Grupo do modelo ou id do elemento desenhado. */
  chave: string
  /** Elemento desenhado pelo usuário. */
  elemento?: boolean
  /** Em segmentos sobrepostos, vale o de maior prioridade (esquadria ou revestimento sobre a parede). */
  prioridade: number
}

/** Plano de corte: as coordenadas 2D de um ponto são (p·u, p·v) e o plano é n·p = d. */
export interface Plano { u: Ponto; v: Ponto; n: Ponto; d: number }

const EPS = 1e-6
const dot3 = (a: Ponto, b: Ponto) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const dist = (a: P2, b: P2) => Math.hypot(b[0] - a[0], b[1] - a[1])

/**
 * Planos das três vistas. A planta corta na altura da fonte; os cortes passam pela fonte,
 * o longitudinal ao longo do eixo maior da sala e o transversal perpendicular a ele.
 */
export function planoDa(vista: Vista, fonte: Ponto, eixo: P2): Plano {
  if (vista === 'planta') return { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], d: fonte[2] }
  const e: Ponto = vista === 'longitudinal' ? [eixo[0], eixo[1], 0] : [-eixo[1], eixo[0], 0]
  const n: Ponto = [-e[1], e[0], 0]
  return { u: e, v: [0, 0, 1], n, d: dot3(n, fonte) }
}

export const projetar = (pl: Plano, p: Ponto): P2 => [dot3(p, pl.u), dot3(p, pl.v)]

/** Ponto 3D de uma posição 2D da vista, mantendo a coordenada fora do plano de `base`. */
export function voltar(pl: Plano, q: P2, base: Ponto): Ponto {
  const fora = dot3(base, pl.n)
  return [0, 1, 2].map((k) => pl.u[k] * q[0] + pl.v[k] * q[1] + pl.n[k] * fora) as Ponto
}

/** Trechos de uma face 3D cortada pelo plano, já em coordenadas 2D. */
export function cortar(pl: Plano, pontos: Ponto[]): [P2, P2][] {
  const s = pontos.map((p) => { const x = dot3(pl.n, p) - pl.d; return Math.abs(x) < 1e-9 ? 1e-9 : x })
  const cruzamentos: P2[] = []
  for (let i = 0; i < pontos.length; i++) {
    const j = (i + 1) % pontos.length
    if ((s[i] > 0) === (s[j] > 0)) continue
    const t = s[i] / (s[i] - s[j])
    const a = pontos[i], b = pontos[j]
    cruzamentos.push(projetar(pl, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]))
  }
  if (cruzamentos.length < 2) return []
  // Os cruzamentos ficam todos sobre uma reta: em ordem ao longo dela, formam pares entrada/saída.
  const [p0] = cruzamentos
  let dir: P2 = [0, 0]
  for (const q of cruzamentos) if (dist(p0, q) > dist([0, 0], dir)) dir = [q[0] - p0[0], q[1] - p0[1]]
  const ordem = cruzamentos.map((q) => ({ q, t: (q[0] - p0[0]) * dir[0] + (q[1] - p0[1]) * dir[1] })).sort((x, y) => x.t - y.t)
  const r: [P2, P2][] = []
  for (let i = 0; i + 1 < ordem.length; i += 2) if (dist(ordem[i].q, ordem[i + 1].q) > 0.005) r.push([ordem[i].q, ordem[i + 1].q])
  return r
}

/** Junta trechos colineares e encostados da mesma superfície (o modelo costuma vir fragmentado). */
export function unir(segs: Segmento[]): Segmento[] {
  const grupos = new Map<string, { s: Segmento; d: P2; t0: number; t1: number; o: P2 }[]>()
  for (const s of segs) {
    let d: P2 = [s.b[0] - s.a[0], s.b[1] - s.a[1]]
    const L = Math.hypot(d[0], d[1])
    if (L < EPS) continue
    d = [d[0] / L, d[1] / L]
    if (d[0] < -EPS || (Math.abs(d[0]) <= EPS && d[1] < 0)) d = [-d[0], -d[1]]
    const ta = s.a[0] * d[0] + s.a[1] * d[1], tb = s.b[0] * d[0] + s.b[1] * d[1]
    const o: P2 = [s.a[0] - d[0] * ta, s.a[1] - d[1] * ta]
    const chave = `${s.chave}|${Math.round(d[0] * 1e3)},${Math.round(d[1] * 1e3)}|${Math.round(o[0] * 1e3)},${Math.round(o[1] * 1e3)}`
    grupos.set(chave, [...(grupos.get(chave) ?? []), { s, d, o, t0: Math.min(ta, tb), t1: Math.max(ta, tb) }])
  }
  const r: Segmento[] = []
  for (const lista of grupos.values()) {
    lista.sort((x, y) => x.t0 - y.t0)
    let atual = { ...lista[0] }
    const fechar = () => r.push({ ...atual.s, a: [atual.o[0] + atual.d[0] * atual.t0, atual.o[1] + atual.d[1] * atual.t0], b: [atual.o[0] + atual.d[0] * atual.t1, atual.o[1] + atual.d[1] * atual.t1] })
    for (const it of lista.slice(1)) {
      if (it.t0 <= atual.t1 + 1e-3) atual.t1 = Math.max(atual.t1, it.t1)
      else { fechar(); atual = { ...it } }
    }
    fechar()
  }
  return r
}

interface Impacto { t: number; seg: number; ponto: P2 }

/** Primeira superfície atingida pelo raio que sai de `o` na direção `d` (t é a distância, com |d| = 1). */
export function impacto(segs: Segmento[], o: P2, d: P2, ignorar = -1, tMax = Infinity): Impacto | null {
  let melhor: Impacto | null = null
  for (let i = 0; i < segs.length; i++) {
    if (i === ignorar) continue
    const { a, b } = segs[i]
    const ex = b[0] - a[0], ey = b[1] - a[1]
    const den = d[0] * ey - d[1] * ex
    if (Math.abs(den) < 1e-12) continue
    const wx = a[0] - o[0], wy = a[1] - o[1]
    const t = (wx * ey - wy * ex) / den
    const s = (wx * d[1] - wy * d[0]) / den
    if (t <= 1e-6 || t >= tMax || s < -1e-9 || s > 1 + 1e-9) continue
    // Segmentos sobrepostos no mesmo ponto: fica o de maior prioridade.
    if (!melhor || t < melhor.t - 1e-6 || (Math.abs(t - melhor.t) <= 1e-6 && segs[i].prioridade > segs[melhor.seg].prioridade)) {
      melhor = { t, seg: i, ponto: [o[0] + d[0] * t, o[1] + d[1] * t] }
    }
  }
  return melhor
}

function refletir(d: P2, s: Segmento): P2 {
  const ex = s.b[0] - s.a[0], ey = s.b[1] - s.a[1]
  const L = Math.hypot(ex, ey)
  const n: P2 = [-ey / L, ex / L]
  const k = 2 * (d[0] * n[0] + d[1] * n[1])
  return [d[0] - k * n[0], d[1] - k * n[1]]
}

/** Imagem do ponto espelhado na reta do segmento. */
export function espelhar(p: P2, s: Segmento): P2 {
  const ex = s.b[0] - s.a[0], ey = s.b[1] - s.a[1]
  const L2 = ex * ex + ey * ey
  const t = ((p[0] - s.a[0]) * ex + (p[1] - s.a[1]) * ey) / L2
  const q: P2 = [s.a[0] + ex * t, s.a[1] + ey * t]
  return [2 * q[0] - p[0], 2 * q[1] - p[1]]
}

/** Trecho de um raio do leque: ordem 0 é o som que sai da fonte, 1 depois da primeira reflexão etc. */
export interface TrechoRaio { a: P2; b: P2; ordem: number; energia: number }

/**
 * Leque de raios a partir da fonte, com reflexão especular e perda de energia (1 − α) a cada superfície.
 * Raios que escapam do modelo (aberturas no corte) seguem até `alcance`.
 */
export function leque(segs: Segmento[], fonte: P2, quantidade: number, ordemMax: number, banda: number, alcance: number): TrechoRaio[] {
  const r: TrechoRaio[] = []
  for (let k = 0; k < quantidade; k++) {
    const ang = (2 * Math.PI * (k + 0.5)) / quantidade
    let o = fonte, d: P2 = [Math.cos(ang), Math.sin(ang)], energia = 1, ignorar = -1
    for (let ordem = 0; ordem <= ordemMax; ordem++) {
      const h = impacto(segs, o, d, ignorar)
      if (!h) { r.push({ a: o, b: [o[0] + d[0] * alcance, o[1] + d[1] * alcance], ordem, energia }); break }
      r.push({ a: o, b: h.ponto, ordem, energia })
      energia *= 1 - segs[h.seg].alfa[banda]
      if (energia < 1e-3) break
      d = refletir(d, segs[h.seg])
      o = h.ponto
      ignorar = h.seg
    }
  }
  return r
}

export interface Reflexao {
  /** Fonte, pontos de reflexão e receptor. */
  pontos: P2[]
  /** Índices dos segmentos refletores, na ordem do percurso. */
  superficies: number[]
  ordem: number
  /** Comprimento do percurso (m). */
  percurso: number
  /** Atraso em relação ao som direto (ms). */
  atraso: number
  /** Nível em relação ao som direto (dB): divergência esférica e absorção das superfícies. */
  nivel: number
}

export interface Reflexoes {
  direto: { percurso: number; obstruido: boolean }
  lista: Reflexao[]
}

/** Trecho de a até b sem nenhuma superfície no meio (fora as das pontas). */
function livre(segs: Segmento[], a: P2, b: P2, ignorar: number[]): boolean {
  const L = dist(a, b)
  if (L < EPS) return true
  const d: P2 = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]
  for (let i = 0; i < segs.length; i++) {
    if (ignorar.includes(i)) continue
    const h = impacto([segs[i]], a, d, -1, L - 1e-6)
    if (h) return false
  }
  return true
}

/**
 * Reflexões especulares pelo método das fontes-imagem, até a ordem pedida, que chegam ao receptor
 * com atraso de até `atrasoMax` ms. O nível usa 20·log(r₀/r) mais 10·log do produto de (1 − α).
 */
export function reflexoes(segs: Segmento[], fonte: P2, receptor: P2, ordemMax: number, banda: number, atrasoMax = 200): Reflexoes {
  const r0 = Math.max(dist(fonte, receptor), 0.01)
  const direto = { percurso: r0, obstruido: !livre(segs, fonte, receptor, []) }
  const lista: Reflexao[] = []
  const percursoMax = r0 + (atrasoMax / 1000) * C_SOM

  function validar(imagens: P2[], seq: number[]): P2[] | null {
    // Do receptor para trás: cada trecho mira a imagem anterior e precisa cruzar o segmento dela.
    const pts: P2[] = [receptor]
    let alvo = receptor
    for (let k = seq.length - 1; k >= 0; k--) {
      const img = imagens[k]
      const L = dist(alvo, img)
      if (L < EPS) return null
      const d: P2 = [(img[0] - alvo[0]) / L, (img[1] - alvo[1]) / L]
      const h = impacto([segs[seq[k]]], alvo, d, -1, L)
      if (!h) return null
      const anterior = k + 1 < seq.length ? [seq[k + 1]] : []
      if (!livre(segs, alvo, h.ponto, [seq[k], ...anterior])) return null
      pts.push(h.ponto)
      alvo = h.ponto
    }
    if (!livre(segs, alvo, fonte, [seq[0]])) return null
    pts.push(fonte)
    return pts.reverse()
  }

  function descer(imagens: P2[], seq: number[]) {
    for (let i = 0; i < segs.length; i++) {
      if (seq.length && seq[seq.length - 1] === i) continue
      const anterior = imagens.length ? imagens[imagens.length - 1] : fonte
      const img = espelhar(anterior, segs[i])
      // O percurso de uma reflexão válida tem o comprimento da distância da imagem ao receptor.
      const L = dist(img, receptor)
      if (L > percursoMax) continue
      const novaSeq = [...seq, i], novas = [...imagens, img]
      const pts = validar(novas, novaSeq)
      if (pts) {
        const perda = novaSeq.reduce((p, s) => p * Math.max(1 - segs[s].alfa[banda], 1e-6), 1)
        lista.push({ pontos: pts, superficies: novaSeq, ordem: novaSeq.length, percurso: L, atraso: ((L - r0) / C_SOM) * 1000, nivel: 20 * Math.log10(r0 / L) + 10 * Math.log10(perda) })
      }
      if (novaSeq.length < ordemMax) descer(novas, novaSeq)
    }
  }
  descer([], [])
  // Reflexão na divisa entre dois segmentos colineares (janela e parede) aparece duas vezes: fica a de maior prioridade.
  const unicas = new Map<string, Reflexao>()
  const peso = (r: Reflexao) => r.superficies.reduce((s, i) => s + segs[i].prioridade, 0)
  for (const r of lista) {
    const chave = r.pontos.map((p) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`).join('|')
    const atual = unicas.get(chave)
    if (!atual || peso(r) > peso(atual)) unicas.set(chave, r)
  }
  return { direto, lista: [...unicas.values()].sort((a, b) => a.atraso - b.atraso) }
}

/** Direção do eixo maior da sala em planta, pela parede mais comprida. */
export function eixoMaior(faces: Ponto[][]): P2 {
  let melhor: P2 = [1, 0], comp = 0
  for (const f of faces) {
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length]
      if (Math.abs(a[2] - b[2]) > 1e-3) continue
      const L = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (L > comp) { comp = L; melhor = [(b[0] - a[0]) / L, (b[1] - a[1]) / L] }
    }
  }
  if (melhor[0] < -EPS || (Math.abs(melhor[0]) <= EPS && melhor[1] < 0)) melhor = [-melhor[0], -melhor[1]]
  // O eixo longitudinal é o da maior extensão da sala, que pode ser o perpendicular à parede mais longa.
  const ext = (e: P2) => {
    let lo = Infinity, hi = -Infinity
    for (const f of faces) for (const p of f) { const t = p[0] * e[0] + p[1] * e[1]; lo = Math.min(lo, t); hi = Math.max(hi, t) }
    return hi - lo
  }
  const perp: P2 = [-melhor[1], melhor[0]]
  return ext(perp) > ext(melhor) + 1e-6 ? (perp[0] < 0 ? [-perp[0], -perp[1]] : perp) : melhor
}
