import { describe, expect, it } from 'vitest'
import { contornos } from './contornos'
import type { Ponto } from './modelo'

const emX = (y: number, x0: number, x1: number, z0: number, z1: number): Ponto[] => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]
const comprimento = (lista: ReturnType<typeof contornos>, c: string) => lista.filter((e) => e.c === c).reduce((s, e) => s + Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1], e.b[2] - e.a[2]), 0)

describe('contornos', () => {
  it('esconde as divisões da parede recortada em volta da janela', () => {
    const faces = [
      { c: 'PAREDES', pontos: emX(0, 0, 9, 0, 1) }, { c: 'PAREDES', pontos: emX(0, 0, 9, 2.2, 3) },
      { c: 'PAREDES', pontos: emX(0, 0, 0.5, 1, 2.2) }, { c: 'PAREDES', pontos: emX(0, 8.5, 9, 1, 2.2) },
      { c: 'JANELAS', pontos: emX(0, 0.5, 8.5, 1, 2.2) },
    ]
    const a = contornos(faces)
    // Parede: perímetro externo (24) mais o vão da janela (18,4).
    expect(comprimento(a, 'PAREDES')).toBeCloseTo(24 + 18.4, 6)
    expect(comprimento(a, 'JANELAS')).toBeCloseTo(18.4, 6)
  })

  it('esconde a diagonal de um piso triangulado', () => {
    const a = contornos([{ c: 'PISO', pontos: [[0, 0, 0], [4, 0, 0], [4, 3, 0]] }, { c: 'PISO', pontos: [[0, 0, 0], [4, 3, 0], [0, 3, 0]] }])
    expect(comprimento(a, 'PISO')).toBeCloseTo(14, 6)
  })
})
