import { describe, expect, it } from 'vitest'
import { Catalogo } from '../motor/materiais'
import { projetoExemplo } from '../dados/exemplo'
import { aplicarImportacao, sugerirDestino } from './aplicar'
import { lerDXF, lerOBJ, quadroDeAreas, unidadeProvavel } from './modelo'

import dxf from '../../public/exemplos/sala-de-aula.dxf?raw'
import obj from '../../public/exemplos/sala-de-aula.obj?raw'

const ler = (nome: string) => (nome.endsWith('.dxf') ? dxf : obj)
const porLayer = (q: ReturnType<typeof quadroDeAreas>) => Object.fromEntries(q.linhas.map((l) => [l.chave, l]))

describe('importação de modelos', () => {
  it('lê o DXF da sala de aula com unidade, blocos e áreas por layer', () => {
    const m = lerDXF(ler('sala-de-aula.dxf'))
    expect(m.unidade).toBe('mm')
    const q = quadroDeAreas(m, unidadeProvavel(m))
    const l = porLayer(q)
    expect(l.PISO.areas.piso).toBeCloseTo(63, 6)
    expect(l.FORRO.areas.teto).toBeCloseTo(63, 6)
    expect(l['FORRO ACUSTICO'].areas.teto).toBeCloseTo(53, 6)
    expect(l.PAREDES.areas.parede).toBeCloseTo(96 - 9.6 - 1.89, 6)
    expect(l.JANELAS.total).toBeCloseTo(9.6, 6)
    // A porta vem de um bloco inserido com rotação de 90°: fica na parede x = 0.
    expect(l.PORTAS.areas.parede).toBeCloseTo(1.89, 6)
    expect(q.volumeCaixa).toBeCloseTo(189, 6)
  })

  it('lê o OBJ por grupo ou por material', () => {
    const texto = ler('sala-de-aula.obj')
    const g = porLayer(quadroDeAreas(lerOBJ(texto), 'm'))
    expect(g.PAREDES.total).toBeCloseTo(84.51, 6)
    const mat = porLayer(quadroDeAreas(lerOBJ(texto, 'material'), 'm'))
    expect(mat.Vidro.total).toBeCloseTo(9.6, 6)
  })

  it('sugere o destino pelo nome e cria bases com os itens descontados', () => {
    const q = quadroDeAreas(lerDXF(ler('sala-de-aula.dxf')), 'mm')
    const destinos = Object.fromEntries(q.linhas.map((l) => [l.chave, sugerirDestino(l)]))
    expect(destinos).toEqual({ FORRO: 'teto', 'FORRO ACUSTICO': 'revestimento', JANELAS: 'esquadria', PAREDES: 'parede', PISO: 'piso', PORTAS: 'esquadria' })
    const cat = new Catalogo()
    const c = projetoExemplo().cenarios[0]
    const r = aplicarImportacao(c, q.linhas.map((linha) => ({ linha, destino: destinos[linha.chave] })), { substituir: true, vaosRecortados: true }, cat)
    if ('erro' in r) throw new Error(r.erro)
    const s = Object.fromEntries(r.superficies.map((x) => [x.nome, x]))
    // Com os vãos recortados no modelo, a parede volta a ter a área cheia.
    expect(s.PAREDES.area).toBeCloseTo(96, 6)
    expect(s.JANELAS.base).toBe(s.PAREDES.id)
    expect(s['FORRO ACUSTICO'].base).toBe(s.FORRO.id)
    expect(cat.get(s.PORTAS.material).nome).toBe('MADEIRA PINTADA OU ENVERNIZADA')
  })

  it('dá NRC calculado aos materiais com α sem NRC', () => {
    const cat = new Catalogo()
    const m = cat.porNome('AMBI CFQ 18X18 FORRO')
    expect(m.nrcEstimado).toBe(true)
    expect(m.nrc! * 20).toBeCloseTo(Math.round(m.nrc! * 20), 9)
    expect(cat.todos.filter((x) => !x.unidade).every((x) => x.nrc !== undefined)).toBe(true)
  })
})
