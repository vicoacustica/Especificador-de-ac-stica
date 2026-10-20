import { describe, expect, it } from 'vitest'
import casos from './casos-planilha.json'
import { areaEfetiva, avaliar, calcular, dimensionar, LIMITE_EYRING, validarSuperficies } from './acustica'
import { avMinimo, tempoAlvo, tempoOtimoNBR } from './criterios'
import { Catalogo, MATERIAIS_BASE, paraSuperficie } from './materiais'
import { areaDaForma, ESTADOS, type Cenario, type Umidade } from './tipos'

const cat = new Catalogo()
const id = (nome: string) => cat.porNome(nome).id

const UMIDADE_DO_AR: Record<string, Umidade> = {
  'Ar- umidade relativa 40%': 40,
  'Ar Umidade relativa 50%': 50,
  'Ar Umidade relativa 60%': 60,
}

function cenarioDoCaso(caso: (typeof casos)[number]): Cenario {
  return {
    id: caso.nome,
    nome: caso.nome,
    criterio: { norma: 'A', grupo: 'A3' },
    volume: caso.volume,
    peDireito: 3,
    umidade: caso.ar ? UMIDADE_DO_AR[caso.ar] : 0,
    ocupacoes: { vazio: true, meio: true, cheio: true },
    superficies: caso.superficies.map((s, i) => ({
      id: `s${i}`, nome: s.nome, categoria: 'parede', modo: 'area', area: s.quantidade, material: id(s.material),
    })),
    itens: caso.ocupacao
      ? [{ id: 'o', tipo: 'assento', nome: 'assentos', quantidade: caso.ocupacao.quantidade, material: id(caso.ocupacao.vazio), materialOcupado: id(caso.ocupacao.ocupado) }]
      : [],
  }
}

function comparar(obtido: (number | null)[], esperado: number[]) {
  // A planilha mostra 0 onde o motor devolve null (IFERROR).
  obtido.forEach((v, i) => expect(v ?? 0).toBeCloseTo(esperado[i], 9))
}

describe.each(casos)('igual à planilha recalculada: $nome', (caso) => {
  const r = calcular(cenarioDoCaso(caso), cat)
  it.each(ESTADOS)('absorção, ᾱ, Sabine e Eyring-Norris (%s)', (estado) => {
    comparar(r.porEstado[estado].absorcao, caso.esperado.absorcao[estado])
    comparar(r.porEstado[estado].alfa, caso.esperado.alfaMedio[estado])
    comparar(r.porEstado[estado].sabine, caso.esperado.sabine[estado])
    comparar(r.porEstado[estado].eyring, caso.esperado.eyring[estado])
  })
  it('A/V com a sala ocupada', () => {
    comparar(r.porEstado.cheio.absorcao.map((a) => a / caso.volume), caso.esperado.relacaoAV)
  })
})

function salaDeAula(): Cenario {
  return {
    id: 'c', nome: 'sala', criterio: { norma: 'A', grupo: 'A3' }, volume: 189, peDireito: 3, umidade: 50,
    ocupacoes: { vazio: true, meio: true, cheio: true },
    superficies: [
      { id: 'piso', nome: 'Piso', categoria: 'piso', modo: 'dimensoes', area: 0, largura: 9, altura: 7, material: id('LAJOTA CERÂMICA') },
      { id: 'teto', nome: 'Teto', categoria: 'teto', modo: 'area', area: 63, material: id('GESSO LISO') },
      { id: 'par', nome: 'Paredes', categoria: 'parede', modo: 'area', area: 96, material: id('ALVENARIA LISA OU PINTADA') },
      { id: 'jan', nome: 'Janelas', categoria: 'esquadria', base: 'par', modo: 'area', area: 9.6, material: id('VIDRO COMUM') },
      { id: 'forro', nome: 'Forro acústico', categoria: 'revestimento', base: 'teto', modo: 'area', area: 53, material: id('AMBI CFQ 18X18 FORRO') },
    ],
    itens: [{ id: 'a', tipo: 'assento', nome: 'Carteiras', quantidade: 40, material: id('Cadeira com encosto e assento contraplacado (UNIDADE)'), materialOcupado: id('ADULTO SENTADO INCLUINDO CADEIRA (UNIDADE)') }],
  }
}

describe('superfícies', () => {
  it('desconta da base a área dos itens sobre ela', () => {
    const c = salaDeAula()
    expect(areaEfetiva(c, c.superficies[0])).toBeCloseTo(63)
    expect(areaEfetiva(c, c.superficies[1])).toBeCloseTo(10)
    expect(areaEfetiva(c, c.superficies[2])).toBeCloseTo(86.4)
    expect(validarSuperficies(c)).toEqual([])
  })
  it('acusa itens maiores que a base', () => {
    const c = salaDeAula()
    c.superficies[4].area = 70
    expect(validarSuperficies(c).map((p) => p.superficie)).toEqual(['teto'])
  })
  it('materiais de ocupação e por unidade ficam fora das superfícies', () => {
    const fora = MATERIAIS_BASE.filter((m) => !paraSuperficie(m))
    expect(fora.every((m) => m.unidade || ['PÚBLICO', 'ASSENTOS', 'ACÚSTICO - NUVEM/BAFFLE', 'ACÚSTICO - BAFFLE'].includes(m.tipo))).toBe(true)
    expect(MATERIAIS_BASE.filter(paraSuperficie).some((m) => /UNIDADE/i.test(m.nome))).toBe(false)
  })
})

describe('ocupação', () => {
  it('50% dos assentos ocupados fica entre vazio e cheio', () => {
    const r = calcular(salaDeAula(), cat).porEstado
    r.meio.absorcao.forEach((a, i) => expect(a).toBeCloseTo((r.vazio.absorcao[i] + r.cheio.absorcao[i]) / 2, 9))
  })
  it('público sem assento entra com a fração ocupada', () => {
    const c = salaDeAula()
    c.itens = [{ id: 'p', tipo: 'publico', nome: 'em pé', quantidade: 10, material: id('ADULTO EM PÉ (UNIDADE)') }]
    const r = calcular(c, cat).porEstado
    const pessoa = cat.porNome('ADULTO EM PÉ (UNIDADE)').alfa
    r.cheio.absorcao.forEach((a, i) => expect(a - r.vazio.absorcao[i]).toBeCloseTo(10 * pessoa[i], 9))
  })
  it('só os cenários de ocupação escolhidos contam na aprovação', () => {
    const c = salaDeAula()
    c.ocupacoes = { vazio: false, meio: false, cheio: true }
    expect(calcular(c, cat).estados).toEqual(['cheio'])
  })
})

describe('fórmula automática', () => {
  it('usa Sabine com ᾱ médio até 0,30', () => {
    const r = calcular(salaDeAula(), cat)
    expect(r.alfaMedioSala).toBeLessThanOrEqual(LIMITE_EYRING)
    expect(r.formula).toBe('sabine')
    expect(r.tempo.cheio).toEqual(r.porEstado.cheio.sabine)
  })
  it('usa Eyring com ᾱ médio acima de 0,30, no estado mais absorvente', () => {
    const c = salaDeAula()
    c.superficies[2].material = id('SONEX 50/125')
    const r = calcular(c, cat)
    expect(r.alfaMedioSala).toBeGreaterThan(LIMITE_EYRING)
    expect(r.estadoAlfaMedio).toBe('cheio')
    expect(r.formula).toBe('eyring')
    expect(r.tempo.vazio).toEqual(r.porEstado.vazio.eyring)
  })
})

describe('critérios', () => {
  it('DIN 18041 grupo A confere com o gráfico da norma', () => {
    expect(tempoAlvo('A1', 1000)).toBeCloseTo(1.42, 2)
    expect(tempoAlvo('A2', 5000)).toBeCloseTo(1.23, 2)
    expect(tempoAlvo('A3', 5000)).toBeCloseTo(1.01, 2)
    expect(tempoAlvo('A4', 500)).toBeCloseTo(0.56, 2)
    expect(tempoAlvo('A5', 30000)).toBe(2.0)
  })
  it('DIN 18041 grupo B', () => {
    expect(avMinimo('B5', 2.4)).toBe(0.3)
    expect(avMinimo('B2', 5)).toBeCloseTo(1 / (4.8 + 4.69 * Math.log10(5)), 9)
  })
  it('NBR 12179, estúdio de música de 81 m³ ≈ 0,63 s', () => {
    expect(tempoOtimoNBR('musica', 81)).toBeCloseTo(0.63, 1)
  })
  it('aprovação exige as bandas dentro das margens nos estados avaliados', () => {
    expect(avaliar(salaDeAula(), cat).aprovado).toBe(true)
    const c = salaDeAula()
    c.superficies = c.superficies.filter((s) => s.id !== 'forro')
    expect(avaliar(c, cat).aprovado).toBe(false)
  })
})

describe('dimensionamento', () => {
  it('encontra a faixa de área do forro acústico que atende', () => {
    const d = dimensionar(salaDeAula(), cat, { superficie: 'forro' })
    expect(d.encontrado).toBe(true)
    if (d.encontrado) {
      expect(d.minimo).toBeLessThanOrEqual(53)
      expect(d.maximo).toBeGreaterThanOrEqual(53)
    }
  })
  it('avisa quando nem a área toda resolve', () => {
    const c = salaDeAula()
    c.superficies[4].material = id('CARPETE')
    const d = dimensionar(c, cat, { superficie: 'forro' })
    expect(d).toMatchObject({ encontrado: false, motivo: 'insuficiente' })
  })
})

describe('formas de nuvens e baffles', () => {
  it('calcula a área total de cada formato', () => {
    expect(areaDaForma({ tipo: 'quadrado', medidas: [1.2], quantidade: 10 })).toBeCloseTo(14.4, 9)
    expect(areaDaForma({ tipo: 'retangulo', medidas: [1.2, 0.6], quantidade: 5 })).toBeCloseTo(3.6, 9)
    expect(areaDaForma({ tipo: 'circulo', medidas: [1], quantidade: 4 })).toBeCloseTo(Math.PI, 9)
    expect(areaDaForma({ tipo: 'triangulo', medidas: [1, 1], quantidade: 2 })).toBeCloseTo(1, 9)
    expect(areaDaForma({ tipo: 'trapezio', medidas: [1.2, 0.6, 0.5], quantidade: 2 })).toBeCloseTo(0.9, 9)
  })
})
