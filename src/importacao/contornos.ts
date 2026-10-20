// Contornos das superfícies do modelo: as arestas entre faces do mesmo grupo e no mesmo plano
// (a fragmentação do modelo em faixas, recortes ou triângulos) ficam de fora.
import type { Ponto } from './modelo'

export interface Aresta { c: string; a: Ponto; b: Ponto }

const TOL = 1e-4
const r = (v: number, passo: number) => Math.round(v / passo)

function normalDe(p: Ponto[]): Ponto {
  let nx = 0, ny = 0, nz = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length]
    nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1])
  }
  const m = Math.hypot(nx, ny, nz) || 1
  let n: Ponto = [nx / m, ny / m, nz / m]
  // Mesmo plano com faces em sentidos opostos: a normal é tomada sempre para o mesmo lado.
  const k = Math.abs(n[0]) > TOL ? 0 : Math.abs(n[1]) > TOL ? 1 : 2
  if (n[k] < 0) n = [-n[0], -n[1], -n[2]]
  return n
}

/** Intervalos [t0, t1] de `livre` que sobram depois de tirar os trechos cobertos. */
function subtrair(livre: [number, number], cobertos: [number, number][]): [number, number][] {
  let partes: [number, number][] = [livre]
  for (const [c0, c1] of cobertos) {
    partes = partes.flatMap(([p0, p1]): [number, number][] => {
      if (c1 <= p0 + TOL || c0 >= p1 - TOL) return [[p0, p1]]
      const resto: [number, number][] = []
      if (c0 > p0 + TOL) resto.push([p0, c0])
      if (c1 < p1 - TOL) resto.push([c1, p1])
      return resto
    })
  }
  return partes
}

/**
 * Arestas visíveis das faces: cada aresta perde os trechos que encostam em outra face do mesmo grupo
 * e do mesmo plano. O que sobra é o contorno de cada superfície; a divisa entre superfícies diferentes
 * aparece uma vez para cada uma, para que o contorno de cada grupo fique completo.
 */
export function contornos(faces: { c: string; pontos: Ponto[] }[]): Aresta[] {
  // Arestas agrupadas pela reta que as contém, dentro de cada grupo e plano.
  type Item = { face: number; a: Ponto; b: Ponto; d: Ponto; t0: number; t1: number; o: Ponto }
  const porReta = new Map<string, Item[]>()
  faces.forEach((f, i) => {
    const p = f.pontos
    if (p.length < 2) return
    const n = normalDe(p)
    const plano = `${f.c}|${r(n[0], 1e-3)},${r(n[1], 1e-3)},${r(n[2], 1e-3)}|${r(n[0] * p[0][0] + n[1] * p[0][1] + n[2] * p[0][2], 1e-3)}`
    for (let k = 0; k < p.length; k++) {
      const a = p[k], b = p[(k + 1) % p.length]
      let d: Ponto = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
      const L = Math.hypot(...d)
      if (L < TOL) continue
      d = [d[0] / L, d[1] / L, d[2] / L]
      // Direção com sentido único, e o ponto da reta mais próximo da origem para identificá-la.
      const j = Math.abs(d[0]) > TOL ? 0 : Math.abs(d[1]) > TOL ? 1 : 2
      if (d[j] < 0) d = [-d[0], -d[1], -d[2]]
      const s = a[0] * d[0] + a[1] * d[1] + a[2] * d[2]
      const o: Ponto = [a[0] - d[0] * s, a[1] - d[1] * s, a[2] - d[2] * s]
      const tb = b[0] * d[0] + b[1] * d[1] + b[2] * d[2]
      const item = { face: i, a, b, d, o, t0: Math.min(s, tb), t1: Math.max(s, tb) }
      const chave = `${plano}|${r(d[0], 1e-3)},${r(d[1], 1e-3)},${r(d[2], 1e-3)}|${r(o[0], 1e-3)},${r(o[1], 1e-3)},${r(o[2], 1e-3)}`
      porReta.set(chave, [...(porReta.get(chave) ?? []), item])
    }
  })
  const saida: Aresta[] = []
  for (const lista of porReta.values()) {
    for (const it of lista) {
      const cobertos = lista.filter((x) => x.face !== it.face).map((x): [number, number] => [x.t0, x.t1])
      const c = faces[it.face].c
      for (const [t0, t1] of cobertos.length ? subtrair([it.t0, it.t1], cobertos) : [[it.t0, it.t1] as [number, number]]) {
        const pt = (t: number): Ponto => [it.o[0] + it.d[0] * t, it.o[1] + it.d[1] * t, it.o[2] + it.d[2] * t]
        saida.push({ c, a: pt(t0), b: pt(t1) })
      }
    }
  }
  return saida
}
