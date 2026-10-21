// Superfícies de um ambiente a partir de um IFC: cada plano da envoltória do espaço (IfcSpace) é
// dividido em uma grade, e do centro de cada célula sai um raio para fora; o primeiro elemento atingido
// (parede, laje, forro, janela, porta...) dá o material daquela célula. Assim um modelo feito para projeto, sem superfícies
// de contorno, vira o quadro de áreas por material, com os vãos de portas e janelas já separados.
import type { CategoriaSuperficie } from '../motor/tipos'
import { orientacao, type Modelo, type Orientacao, type Ponto } from './modelo'

export type TipoElemento = 'parede' | 'laje' | 'cobertura' | 'revestimento' | 'janela' | 'porta' | 'pele' | 'estrutura' | 'pilar' | 'viga' | 'escada' | 'guarda' | 'outro'

interface MalhaIFC {
  id: number
  /** Triângulos em metros, 9 números por triângulo, z para cima. */
  triangulos: Float32Array
  min: Ponto
  max: Ponto
}
export interface ElementoIFC extends MalhaIFC {
  tipo: TipoElemento
  /** PredefinedType do IFC (CEILING, FLOORING, FLOOR, ROOF...). */
  predefinido: string
  /** Material, ou o nome do tipo quando não há material. */
  nome: string
}
export interface EspacoIFC extends MalhaIFC {
  nome: string
  nomeLongo: string
}
export interface ArquivoIFC {
  schema: string
  espacos: EspacoIFC[]
  elementos: ElementoIFC[]
}

export const rotuloEspaco = (e: EspacoIFC) => [e.nome, e.nomeLongo].filter(Boolean).join(' · ') || `Espaço ${e.id}`

/** Volume de uma malha fechada (m³), pelo teorema da divergência; positivo com as normais para fora. */
export function volumeAssinado(t: Float32Array): number {
  let v = 0
  for (let i = 0; i < t.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = t.subarray(i, i + 9)
    v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)
  }
  return v / 6
}

/** Os raios partem 5 cm para dentro do espaço e procuram elementos até 1 m para fora dele. */
const RECUO = 0.05
const ALCANCE = 1
/**
 * Cada plano da envoltória vira uma grade com linhas nos vértices dos elementos próximos (bordas de
 * janelas, portas, forros) e ao menos a cada 25 cm; assim as bordas retas caem sobre as linhas.
 */
const PASSO = 0.25
const TOLERANCIA = 0.005

const PREFIXO_ORIENTACAO: Record<Orientacao, string> = { piso: 'Piso', parede: 'Parede', teto: 'Teto', inclinada: 'Teto inclinado' }
const BASE: Record<Orientacao, CategoriaSuperficie> = { piso: 'piso', parede: 'parede', teto: 'teto', inclinada: 'teto' }

/** Nome da superfície e o tipo dela no cenário. Tudo vira base, menos portas e janelas. */
function camada(el: ElementoIFC | null, o: Orientacao): { nome: string; tipo: CategoriaSuperficie } {
  if (!el) return { nome: `Sem elemento · ${PREFIXO_ORIENTACAO[o]}`, tipo: BASE[o] }
  const base = (prefixo: string) => ({ nome: `${prefixo} · ${el.nome || PREFIXO_ORIENTACAO[o]}`, tipo: BASE[o] })
  switch (el.tipo) {
    case 'janela': return { nome: `Janela · ${el.nome || 'sem material'}`, tipo: 'esquadria' }
    case 'porta': return { nome: `Porta · ${el.nome || 'sem material'}`, tipo: 'esquadria' }
    case 'pele': return { nome: `Esquadria · ${el.nome || 'painel'}`, tipo: 'esquadria' }
    case 'revestimento': return base(o === 'teto' || o === 'inclinada' ? 'Forro' : o === 'piso' ? 'Piso' : 'Revestimento')
    case 'cobertura': return base('Cobertura')
    case 'pilar': return base('Pilar')
    case 'viga': return base('Viga')
    case 'estrutura': return base('Montante')
    case 'escada': return base('Escada')
    case 'guarda': return base('Guarda-corpo')
    case 'outro': return base('Elemento')
    default: return base(PREFIXO_ORIENTACAO[o])
  }
}

export interface ResultadoEspaco {
  modelo: Modelo
  /** Volume interno do espaço, em m³. */
  volume: number
  /** Altura do espaço, em m. */
  peDireito: number
  /** Área da envoltória sem elemento encontrado (vãos abertos ou espaço maior que o modelo). */
  semElemento: number
  /** Elementos próximos ao espaço que foram testados. */
  elementos: number
}

type V3 = [number, number, number]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const esc = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

export function modeloDoEspaco(arq: ArquivoIFC, espaco: EspacoIFC): ResultadoEspaco {
  const t = espaco.triangulos
  const sinal = volumeAssinado(t) < 0 ? -1 : 1
  const zMeio = (espaco.min[2] + espaco.max[2]) / 2
  const folga = ALCANCE + RECUO
  const ao = (min: Ponto, max: Ponto, f: number) => (e: ElementoIFC) => [0, 1, 2].every((k) => e.max[k] >= min[k] - f && e.min[k] <= max[k] + f)
  const perto = arq.elementos.filter(ao(espaco.min, espaco.max, folga))

  // Triângulos da envoltória agrupados por plano, com a normal para fora.
  interface Plano { n: V3; d: number; tris: V3[][] }
  const planos: Plano[] = []
  for (let i = 0; i < t.length; i += 9) {
    const tri: V3[] = [[t[i], t[i + 1], t[i + 2]], [t[i + 3], t[i + 4], t[i + 5]], [t[i + 6], t[i + 7], t[i + 8]]]
    const nn = cruz(sub(tri[1], tri[0]), sub(tri[2], tri[0]))
    const m = Math.hypot(...nn)
    if (m < 1e-9) continue
    const n: V3 = [(sinal * nn[0]) / m, (sinal * nn[1]) / m, (sinal * nn[2]) / m]
    const d = esc(n, tri[0])
    const pl = planos.find((q) => esc(q.n, n) > 1 - 1e-6 && Math.abs(q.d - d) < 1e-3)
    if (pl) pl.tris.push(tri)
    else planos.push({ n, d, tris: [tri] })
  }

  interface Pedaco { el: ElementoIFC | null; o: Orientacao; pontos: V3[]; area: number }
  const pedacos: Pedaco[] = []
  for (const { n, d, tris } of planos) {
    const o = orientacao(tris[0], zMeio)
    // Eixos do plano: u horizontal, v para cima (ou y, nos planos horizontais).
    const U: V3 = Math.abs(n[2]) > 0.9 ? [1, 0, 0] : normalizar([-n[1], n[0], 0])
    const V = cruz(n, U)
    const O: V3 = [n[0] * d, n[1] * d, n[2] * d]
    const para2 = (p: V3): [number, number] => { const r = sub(p, O); return [esc(r, U), esc(r, V)] }
    const para3 = ([u, v]: [number, number]): V3 => [O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v, O[2] + U[2] * u + V[2] * v]
    const tris2 = tris.map((tr) => tr.map(para2))
    const us = tris2.flat().map((p) => p[0]), vs = tris2.flat().map((p) => p[1])
    const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]

    // Elementos ao alcance dos raios deste plano, e os vértices deles projetados no plano.
    const pmin: Ponto = [Infinity, Infinity, Infinity], pmax: Ponto = [-Infinity, -Infinity, -Infinity]
    for (const p of tris.flat()) for (let k = 0; k < 3; k++) { pmin[k] = Math.min(pmin[k], p[k]); pmax[k] = Math.max(pmax[k], p[k]) }
    const lista = perto.filter(ao(pmin, pmax, folga))
    for (const el of lista) {
      const tr = el.triangulos
      for (let i = 0; i < tr.length; i += 3) {
        const p: V3 = [tr[i], tr[i + 1], tr[i + 2]]
        const s = esc(p, n) - d
        if (s < -RECUO - 0.01 || s > ALCANCE + 0.01) continue
        const [u, v] = para2(p)
        if (u > u0 && u < u1) us.push(u)
        if (v > v0 && v < v1) vs.push(v)
      }
    }
    // Triângulos dos elementos projetados no plano, em baldes de 0,5 m: o raio sai na direção da normal,
    // então só pode atingir triângulos cuja projeção contém o ponto de partida.
    const B = 0.5
    const nu = Math.max(1, Math.ceil((u1 - u0) / B)), nv = Math.max(1, Math.ceil((v1 - v0) / B))
    const baldes: number[][] = Array.from({ length: nu * nv }, () => [])
    const proj: number[] = [] // por triângulo: u, v e distância ao plano dos três vértices
    const donos: ElementoIFC[] = []
    for (const el of lista) {
      const tr = el.triangulos
      for (let i = 0; i < tr.length; i += 9) {
        const q: number[] = []
        for (let k = 0; k < 3; k++) {
          const p: V3 = [tr[i + 3 * k], tr[i + 3 * k + 1], tr[i + 3 * k + 2]]
          const [u, v] = para2(p)
          q.push(u, v, esc(p, n) - d)
        }
        if (Math.max(q[2], q[5], q[8]) < -RECUO || Math.min(q[2], q[5], q[8]) > ALCANCE) continue
        if (Math.abs((q[3] - q[0]) * (q[7] - q[1]) - (q[4] - q[1]) * (q[6] - q[0])) < 1e-10) continue
        const bu0 = Math.floor((Math.min(q[0], q[3], q[6]) - u0) / B), bu1 = Math.floor((Math.max(q[0], q[3], q[6]) - u0) / B)
        const bv0 = Math.floor((Math.min(q[1], q[4], q[7]) - v0) / B), bv1 = Math.floor((Math.max(q[1], q[4], q[7]) - v0) / B)
        if (bu1 < 0 || bv1 < 0 || bu0 >= nu || bv0 >= nv) continue
        const t = donos.length
        donos.push(el)
        proj.push(...q)
        for (let a = Math.max(0, bu0); a <= Math.min(nu - 1, bu1); a++) for (let b = Math.max(0, bv0); b <= Math.min(nv - 1, bv1); b++) baldes[b * nu + a].push(t)
      }
    }
    /** Elemento mais próximo à frente do ponto (u, v) do plano, de 5 cm para dentro até 1 m para fora. */
    const atingido = (u: number, v: number): ElementoIFC | null => {
      const balde = baldes[Math.min(nv - 1, Math.max(0, Math.floor((v - v0) / B))) * nu + Math.min(nu - 1, Math.max(0, Math.floor((u - u0) / B)))]
      let melhor = Infinity, qual: ElementoIFC | null = null
      for (const t of balde) {
        const k = t * 9
        const [au, av, as, bu, bv, bs, cu, cv, cs] = proj.slice(k, k + 9)
        const det = (bu - au) * (cv - av) - (bv - av) * (cu - au)
        const l1 = ((u - au) * (cv - av) - (v - av) * (cu - au)) / det
        const l2 = ((bu - au) * (v - av) - (bv - av) * (u - au)) / det
        if (l1 < -1e-9 || l2 < -1e-9 || l1 + l2 > 1 + 1e-9) continue
        const s = as + l1 * (bs - as) + l2 * (cs - as)
        if (s >= -RECUO && s <= ALCANCE && s < melhor) { melhor = s; qual = donos[t] }
      }
      return qual
    }
    for (let u = u0 + PASSO; u < u1; u += PASSO) us.push(u)
    for (let v = v0 + PASSO; v < v1; v += PASSO) vs.push(v)
    const lu = linhas(us), lv = linhas(vs)

    // Elemento atingido pelo centro de cada célula; -2 fora da envoltória, -1 sem elemento.
    const ids = new Map<ElementoIFC | null, number>([[null, -1]])
    const idDe = (e: ElementoIFC | null) => { let k = ids.get(e); if (k === undefined) { k = ids.size - 1; ids.set(e, k) } return k }
    const celulas: number[][] = []
    for (let j = 0; j + 1 < lv.length; j++) {
      const linha: number[] = []
      for (let i = 0; i + 1 < lu.length; i++) {
        const c: [number, number] = [(lu[i] + lu[i + 1]) / 2, (lv[j] + lv[j + 1]) / 2]
        linha.push(tris2.some((tr) => dentro(c, tr)) ? idDe(atingido(c[0], c[1])) : -2)
      }
      celulas.push(linha)
    }
    const elDe = [...ids].reduce<(ElementoIFC | null)[]>((a, [e, k]) => { a[k + 1] = e; return a }, [])

    // Células iguais em sequência viram faixas, e faixas iguais em linhas seguidas viram retângulos.
    const abertos = new Map<string, { i0: number; i1: number; j0: number; j1: number; k: number }>()
    const retangulos: { i0: number; i1: number; j0: number; j1: number; k: number }[] = []
    celulas.forEach((linha, j) => {
      const vistos = new Set<string>()
      for (let i = 0; i < linha.length;) {
        let f = i
        while (f + 1 < linha.length && linha[f + 1] === linha[i]) f++
        if (linha[i] !== -2) {
          const chave = `${i},${f},${linha[i]}`
          const r = abertos.get(chave)
          if (r && r.j1 === j - 1) r.j1 = j
          else { const novo = { i0: i, i1: f, j0: j, j1: j, k: linha[i] }; abertos.set(chave, novo); retangulos.push(novo) }
          vistos.add(chave)
        }
        i = f + 1
      }
      for (const chave of [...abertos.keys()]) if (!vistos.has(chave)) abertos.delete(chave)
    })

    // Retângulos que passam da envoltória (paredes inclinadas, cantos não ortogonais) são recortados pelos triângulos.
    for (const r of retangulos) {
      const ret: [number, number][] = [[lu[r.i0], lv[r.j0]], [lu[r.i1 + 1], lv[r.j0]], [lu[r.i1 + 1], lv[r.j1 + 1]], [lu[r.i0], lv[r.j1 + 1]]]
      const area = (lu[r.i1 + 1] - lu[r.i0]) * (lv[r.j1 + 1] - lv[r.j0])
      const partes = tris2.map((tr) => recortar(ret, tr)).filter((p) => p.length >= 3 && area2(p) > 1e-8)
      const soma = partes.reduce((a, p) => a + area2(p), 0)
      const el = elDe[r.k + 1]
      if (Math.abs(soma - area) <= 1e-6 * Math.max(1, area)) pedacos.push({ el, o, pontos: ret.map(para3), area })
      else for (const p of partes) pedacos.push({ el, o, pontos: p.map(para3), area: area2(p) })
    }
  }

  // Nome e tipo de cada pedaço. Camadas com menos de 0,1 m² (frestas e quinas de outros elementos)
  // passam para a maior camada da mesma orientação.
  const tipos: Record<string, CategoriaSuperficie> = {}
  const nomes = pedacos.map((p) => { const c = camada(p.el, p.o); tipos[c.nome] = c.tipo; return c.nome })
  const areas = new Map<string, number>()
  pedacos.forEach((p, k) => areas.set(nomes[k], (areas.get(nomes[k]) ?? 0) + p.area))
  const maior = (tipo: CategoriaSuperficie) => [...areas].filter(([n]) => tipos[n] === tipo).sort((x, y) => y[1] - x[1])[0]?.[0]
  pedacos.forEach((p, k) => {
    if ((areas.get(nomes[k]) ?? 0) >= 0.1) return
    const destino = maior(BASE[p.o])
    if (destino && (areas.get(destino) ?? 0) >= 0.1) nomes[k] = destino
  })
  const usados = new Set(nomes)
  for (const n of Object.keys(tipos)) if (!usados.has(n)) delete tipos[n]

  return {
    modelo: { formato: 'IFC', faces: pedacos.map((p, k) => ({ layer: nomes[k], pontos: p.pontos })), unidade: 'm', ignoradas: {}, tipos },
    volume: Math.abs(volumeAssinado(t)),
    peDireito: espaco.max[2] - espaco.min[2],
    semElemento: pedacos.reduce((s, p, k) => s + (nomes[k].startsWith('Sem elemento') ? p.area : 0), 0),
    elementos: perto.length,
  }
}

const normalizar = (a: V3): V3 => { const m = Math.hypot(...a) || 1; return [a[0] / m, a[1] / m, a[2] / m] }

/** Valores ordenados, sem os que ficam a menos de meio centímetro do anterior. */
function linhas(valores: number[]): number[] {
  const o = [...valores].sort((a, b) => a - b)
  const r: number[] = []
  for (const v of o) if (!r.length || v - r[r.length - 1] > TOLERANCIA) r.push(v)
  // A última linha é a borda do plano.
  if (r.length > 1 && o[o.length - 1] - r[r.length - 1] > 0) r[r.length - 1] = o[o.length - 1]
  return r
}

type P2 = [number, number]
const giro = (a: P2, b: P2, c: P2) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
const area2 = (p: P2[]) => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1] }, 0)) / 2

function dentro(c: P2, [a, b, d]: P2[]): boolean {
  const s = Math.sign(giro(a, b, d)) || 1
  return s * giro(a, b, c) >= -1e-12 && s * giro(b, d, c) >= -1e-12 && s * giro(d, a, c) >= -1e-12
}

/** Recorte de Sutherland–Hodgman do polígono pelo triângulo. */
function recortar(poli: P2[], tri: P2[]): P2[] {
  const s = Math.sign(giro(tri[0], tri[1], tri[2])) || 1
  let saida = poli
  for (let k = 0; k < 3 && saida.length; k++) {
    const a = tri[k], b = tri[(k + 1) % 3]
    const lado = (p: P2) => s * giro(a, b, p)
    const entrada = saida
    saida = []
    for (let i = 0; i < entrada.length; i++) {
      const p = entrada[i], q = entrada[(i + 1) % entrada.length]
      const lp = lado(p), lq = lado(q)
      if (lp >= 0) saida.push(p)
      if ((lp >= 0) !== (lq >= 0)) { const f = lp / (lp - lq); saida.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]) }
    }
  }
  return saida
}
