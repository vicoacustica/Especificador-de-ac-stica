import { describe, expect, it } from 'vitest'
import { montarResposta, razaoReverberante } from './ri'

/** T20 pela integração de Schroeder: inclinação entre −5 e −25 dB, extrapolada a 60 dB. */
function t20(x: Float32Array, fs: number): number {
  const e = new Float64Array(x.length)
  let s = 0
  for (let n = x.length - 1; n >= 0; n--) { s += x[n] * x[n]; e[n] = s }
  const db = (n: number) => 10 * Math.log10(e[n] / e[0])
  let n5 = 0, n25 = 0
  while (db(n5) > -5) n5++
  n25 = n5
  while (db(n25) > -25) n25++
  return ((n25 - n5) / fs) * 3
}

describe('resposta ao impulso', () => {
  const fs = 16000
  it('decai no tempo de reverberação informado', () => {
    for (const T of [0.6, 1.5]) {
      const ri = montarResposta({ tempos: [T, T, T, T, T, T], absorcao: [20, 20, 20, 20, 20, 20], alfa: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1], distancia: 6, reflexoes: [], fs })
      expect(t20(ri, fs)).toBeGreaterThan(T * 0.85)
      expect(t20(ri, fs)).toBeLessThan(T * 1.15)
    }
  })
  it('a parte reverberante cresce com a distância e cai com a absorção', () => {
    expect(razaoReverberante(20, 0.1, 6)).toBeGreaterThan(razaoReverberante(20, 0.1, 2))
    expect(razaoReverberante(80, 0.3, 6)).toBeLessThan(razaoReverberante(20, 0.1, 6))
  })
})
