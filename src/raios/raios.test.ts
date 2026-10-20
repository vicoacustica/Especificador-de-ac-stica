import { describe, expect, it } from 'vitest'
import { Catalogo } from '../motor/materiais'
import { cenarioVazio } from '../dados/exemplo'
import { C_SOM, leque, planoDa, reflexoes } from './motor'
import { montarCena, segmentosDaVista } from './cena'

describe('traçado de raios', () => {
  const cat = new Catalogo()
  const c = cenarioVazio('teste')
  c.peDireito = 3
  c.raios = { fonte: [2, 3, 1.5], receptor: [8, 3, 1.2], elementos: [], caixa: { comprimento: 10, largura: 6 } }
  const cena = montarCena(c, cat)

  it('corta a sala de referência nas três vistas', () => {
    const planta = segmentosDaVista(cena, planoDa('planta', c.raios!.fonte, cena.eixo), 'planta', c.raios!, cat, '#000')
    expect(planta).toHaveLength(4)
    const longitudinal = segmentosDaVista(cena, planoDa('longitudinal', c.raios!.fonte, cena.eixo), 'longitudinal', c.raios!, cat, '#000')
    expect(longitudinal).toHaveLength(4)
    expect(Math.max(...longitudinal.map((s) => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1])))).toBeCloseTo(10)
  })

  it('acha as reflexões de primeira ordem com o atraso pelas fontes-imagem', () => {
    const segs = segmentosDaVista(cena, planoDa('planta', c.raios!.fonte, cena.eixo), 'planta', c.raios!, cat, '#000')
    const r = reflexoes(segs, [2, 3], [8, 3], 1, 3)
    expect(r.direto.percurso).toBeCloseTo(6)
    expect(r.lista).toHaveLength(4)
    // Parede lateral em y = 0: imagem em (2, -3), percurso √(36 + 36).
    const lateral = r.lista.find((x) => Math.abs(x.pontos[1][1]) < 1e-6)!
    expect(lateral.percurso).toBeCloseTo(Math.sqrt(72))
    expect(lateral.atraso).toBeCloseTo(((Math.sqrt(72) - 6) / C_SOM) * 1000)
    expect(lateral.pontos[1][0]).toBeCloseTo(5)
    // Parede do fundo atrás da fonte (x = 0): imagem em (−2, 3), percurso 10.
    expect(r.lista.some((x) => Math.abs(x.percurso - 10) < 1e-6)).toBe(true)
  })

  it('um elemento desenhado bloqueia o som direto e cria uma reflexão', () => {
    const raios = { ...c.raios!, elementos: [{ id: 'e1', vista: 'planta' as const, a: [5, 2] as [number, number], b: [5, 4] as [number, number], material: cat.todos[0].id }] }
    const segs = segmentosDaVista(cena, planoDa('planta', raios.fonte, cena.eixo), 'planta', raios, cat, '#000')
    const r = reflexoes(segs, [2, 3], [8, 3], 2, 3)
    expect(r.direto.obstruido).toBe(true)
    expect(r.lista.every((x) => x.percurso > 6)).toBe(true)
  })

  it('o leque perde energia a cada reflexão', () => {
    const segs = segmentosDaVista(cena, planoDa('planta', c.raios!.fonte, cena.eixo), 'planta', c.raios!, cat, '#000')
    const t = leque(segs, [2, 3], 36, 3, 3, 50)
    expect(t.filter((x) => x.ordem === 0)).toHaveLength(36)
    expect(Math.max(...t.filter((x) => x.ordem === 3).map((x) => x.energia))).toBeLessThan(1)
  })
})
