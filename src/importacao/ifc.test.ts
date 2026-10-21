import { describe, expect, it } from 'vitest'
import { lerIFC } from './ifc'
import { modeloDoEspaco, rotuloEspaco } from './ifc-espaco'
import { quadroDeAreas } from './modelo'
import texto from '../../public/exemplos/sala-de-aula.ifc?raw'

describe('importação de IFC', () => {
  it('separa a envoltória da sala de aula de exemplo por elemento', async () => {
    const arq = await lerIFC(new TextEncoder().encode(texto))
    expect(arq.espacos.map(rotuloEspaco)).toEqual(['101 · Sala de aula'])
    const r = modeloDoEspaco(arq, arq.espacos[0])
    expect(r.volume).toBeCloseTo(189, 1)
    expect(r.peDireito).toBeCloseTo(3, 3)
    expect(r.semElemento).toBeLessThan(0.01)
    const q = quadroDeAreas(r.modelo, 'm')
    const area = Object.fromEntries(q.linhas.map((l) => [l.chave, Math.round(l.total * 100) / 100]))
    expect(area).toEqual({
      'Forro · Forro acústico mineral': 53,
      'Forro · Gesso liso': 10,
      'Janela · Vidro comum': 9.6,
      'Parede · Alvenaria rebocada e pintada': 84.51,
      'Piso · Piso cerâmico': 63,
      'Porta · Madeira pintada': 1.89,
    })
    expect(r.modelo.faces.length).toBeLessThan(30)
    expect(q.linhas.find((l) => l.chave.startsWith('Janela'))!.tipo).toBe('esquadria')
  })
})
