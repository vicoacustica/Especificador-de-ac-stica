// Resposta ao impulso simplificada para a aurilização: som direto, reflexões especulares do traçado de raios
// e cauda reverberante por banda de oitava, com o decaimento do tempo de reverberação (T) de cada banda.
import { BANDAS, type PorBanda } from '../motor/tipos'

export interface ReflexaoRI {
  /** Atraso em relação ao som direto (s). */
  atraso: number
  /** Amplitude em relação ao som direto, por banda: divergência esférica e absorção das superfícies. */
  ganhos: PorBanda
}

export interface DadosRI {
  /** Tempo de reverberação (T) por banda (s); null vira o da banda vizinha. */
  tempos: (number | null)[]
  /** Área de absorção sonora equivalente (A) por banda (m²). */
  absorcao: PorBanda
  /** Coeficiente de absorção médio (ᾱ) por banda. */
  alfa: PorBanda
  /** Distância entre fonte e receptor (m). */
  distancia: number
  reflexoes: ReflexaoRI[]
  fs: number
}

/** Gerador pseudoaleatório com semente: o mesmo cenário soa sempre igual. */
function aleatorio(semente: number) {
  let s = semente >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Biquad Butterworth de 2ª ordem (passa-baixas ou passa-altas), aplicado no lugar. */
function biquad(x: Float32Array, tipo: 'baixas' | 'altas', fc: number, fs: number) {
  const w = (2 * Math.PI * fc) / fs, cw = Math.cos(w), al = Math.sin(w) / Math.SQRT2
  const a0 = 1 + al
  const b0 = (tipo === 'baixas' ? (1 - cw) / 2 : (1 + cw) / 2) / a0
  const b1 = (tipo === 'baixas' ? 1 - cw : -(1 + cw)) / a0
  const b2 = b0, a1 = (-2 * cw) / a0, a2 = (1 - al) / a0
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let n = 0; n < x.length; n++) {
    const x0 = x[n]
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1; x1 = x0; y2 = y1; y1 = y0
    x[n] = y0
  }
}

/** Filtro da banda de oitava i: a 1ª e a última bandas se estendem até as pontas do espectro. */
function filtrarBanda(x: Float32Array, i: number, fs: number) {
  const f = BANDAS[i], baixo = f / Math.SQRT2, alto = f * Math.SQRT2
  for (let k = 0; k < 2; k++) {
    if (i > 0) biquad(x, 'altas', baixo, fs)
    if (i < BANDAS.length - 1) biquad(x, 'baixas', alto, fs)
  }
}

/** Razão entre a energia reverberante e a direta no receptor (teoria da sala difusa): 16·π·r² / R, R = A / (1 − ᾱ). */
export function razaoReverberante(absorcao: number, alfa: number, distancia: number): number {
  const R = absorcao / Math.max(1 - alfa, 0.01)
  return (16 * Math.PI * distancia * distancia) / Math.max(R, 0.01)
}

export function montarResposta(d: DadosRI): Float32Array {
  const tempos = d.tempos.map((t, i) => t ?? d.tempos.find((x, k) => x !== null && Math.abs(k - i) <= 5) ?? 0.5)
  const duracao = Math.min(8, Math.max(0.3, ...tempos) * 1.1 + 0.05)
  const N = Math.ceil(duracao * d.fs)
  const saida = new Float32Array(N)
  const rnd = aleatorio(Math.round(d.distancia * 1000) + tempos.reduce((s, t) => s + Math.round((t as number) * 1000), 0))
  for (let i = 0; i < BANDAS.length; i++) {
    const T = Math.max(tempos[i] as number, 0.05)
    const banda = new Float32Array(N)
    banda[0] = 1
    for (const r of d.reflexoes) {
      const n = Math.round(r.atraso * d.fs)
      if (n > 0 && n < N) banda[n] += r.ganhos[i]
    }
    // Cauda: ruído branco com decaimento de 60 dB em T e energia total igual à razão reverberante.
    const razao = razaoReverberante(d.absorcao[i], d.alfa[i], d.distancia)
    const sigma = Math.sqrt((razao * 13.8155) / (d.fs * T))
    const k = -6.9078 / (T * d.fs)
    const subida = Math.round(0.005 * d.fs)
    for (let n = 1; n < N; n++) {
      const g = (2 * rnd() - 1) * Math.sqrt(3) * sigma * Math.exp(k * n)
      banda[n] += n < subida ? g * (n / subida) : g
    }
    filtrarBanda(banda, i, d.fs)
    for (let n = 0; n < N; n++) saida[n] += banda[n]
  }
  // Fim suave para não estalar.
  const fim = Math.round(0.05 * d.fs)
  for (let n = 0; n < fim; n++) saida[N - 1 - n] *= n / fim
  return saida
}
