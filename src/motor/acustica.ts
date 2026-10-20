// Motor de cálculo do tempo de reverberação de um cenário.
// Reproduz as fórmulas da aba CÁLCULO da PLANILHA_TR.xlsx, com superfícies descontadas da base
// e itens de ocupação avaliados em 0%, 50% e 100%.
import { BANDAS_GRUPO_B, metaDoCriterio, type MetaCriterio } from './criterios'
import { ABSORCAO_AR, type Catalogo } from './materiais'
import {
  BANDAS, CATEGORIAS, ESTADOS, FRACAO_OCUPADA,
  type Cenario, type EstadoOcupacao, type Formula, type PorBanda, type Superficie,
} from './tipos'

/** Limite do coeficiente de absorção médio (ᾱ) acima do qual os resultados usam Eyring. */
export const LIMITE_EYRING = 0.3

function porBanda(f: (i: number) => number): PorBanda {
  return BANDAS.map((_, i) => f(i)) as PorBanda
}

export const ehBase = (s: Superficie) => CATEGORIAS[s.categoria].base

/** Área informada da superfície (m²), direta ou largura × altura. */
export function areaInformada(s: Superficie): number {
  return s.modo === 'dimensoes' ? (s.largura ?? 0) * (s.altura ?? 0) : s.area
}

export function itensSobre(c: Cenario, baseId: string): Superficie[] {
  return c.superficies.filter((s) => !ehBase(s) && s.base === baseId)
}

/** Área da base que sobra depois de descontar os itens sobre ela (pode ser negativa se inválida). */
export function areaLivre(c: Cenario, baseId: string, excetoId?: string): number {
  const base = c.superficies.find((s) => s.id === baseId)
  if (!base) return 0
  return areaInformada(base) - itensSobre(c, baseId).filter((s) => s.id !== excetoId).reduce((a, s) => a + areaInformada(s), 0)
}

/** Área que entra no cálculo: a base sem os itens descontados, ou a própria área do item. */
export function areaEfetiva(c: Cenario, s: Superficie): number {
  return ehBase(s) ? Math.max(0, areaLivre(c, s.id)) : areaInformada(s)
}

export interface ProblemaSuperficie { superficie: string; mensagem: string }

/** Itens descontados não podem somar mais que a base, e todo item precisa de uma base existente. */
export function validarSuperficies(c: Cenario): ProblemaSuperficie[] {
  const problemas: ProblemaSuperficie[] = []
  for (const s of c.superficies) {
    if (ehBase(s)) {
      if (areaLivre(c, s.id) < -1e-9) problemas.push({ superficie: s.id, mensagem: `Os itens sobre “${s.nome}” somam mais que a área dela.` })
    } else {
      const base = c.superficies.find((b) => b.id === s.base && ehBase(b))
      if (!base) problemas.push({ superficie: s.id, mensagem: `“${s.nome}” precisa de uma superfície base.` })
    }
  }
  return problemas
}

export interface ResultadoEstado {
  /** Área de absorção equivalente (A) em m² Sabine, sem o ar. */
  absorcao: PorBanda
  /** Coeficiente de absorção médio por banda, ᾱ = A / S. */
  alfa: PorBanda
  /** Média das seis bandas de ᾱ. */
  alfaMedio: number
  sabine: (number | null)[]
  eyring: (number | null)[]
}

export interface Resultado {
  /** Área total (S): superfícies + quantidades de itens, como na planilha (SUM(E5:E32, E34)). */
  areaTotal: number
  porEstado: Record<EstadoOcupacao, ResultadoEstado>
  /** Estados avaliados, escolhidos pelo usuário. */
  estados: EstadoOcupacao[]
  /** ᾱ médio da sala: o maior entre os estados avaliados. */
  alfaMedioSala: number
  estadoAlfaMedio: EstadoOcupacao
  formula: Formula
  /** Tempo de reverberação (T) pela fórmula escolhida. */
  tempo: Record<EstadoOcupacao, (number | null)[]>
}

export function estadosAvaliados(c: Cenario): EstadoOcupacao[] {
  const e = ESTADOS.filter((x) => c.ocupacoes[x])
  return e.length ? e : ['cheio']
}

export function calcular(c: Cenario, cat: Catalogo): Resultado {
  const V = c.volume
  let S = 0
  const fixa = [0, 0, 0, 0, 0, 0]
  for (const s of c.superficies) {
    const a = areaEfetiva(c, s)
    S += a
    cat.get(s.material).alfa.forEach((al, i) => { fixa[i] += a * al })
  }
  for (const it of c.itens) {
    S += it.quantidade
    if (it.tipo === 'suspenso') cat.get(it.material).alfa.forEach((al, i) => { fixa[i] += it.quantidade * al })
  }
  const ar = ABSORCAO_AR[c.umidade].map((m) => 4 * m * V)

  const porEstado = {} as Record<EstadoOcupacao, ResultadoEstado>
  for (const e of ESTADOS) {
    const x = FRACAO_OCUPADA[e]
    const absorcao = porBanda((i) => c.itens.reduce((soma, it) => {
      if (it.tipo === 'assento') {
        const vazio = cat.get(it.material).alfa[i]
        const ocupado = cat.get(it.materialOcupado ?? it.material).alfa[i]
        return soma + it.quantidade * ((1 - x) * vazio + x * ocupado)
      }
      if (it.tipo === 'publico') return soma + it.quantidade * x * cat.get(it.material).alfa[i]
      return soma
    }, fixa[i]))
    const alfa = porBanda((i) => (S > 0 ? absorcao[i] / S : 0))
    porEstado[e] = {
      absorcao,
      alfa,
      alfaMedio: alfa.reduce((s, a) => s + a, 0) / alfa.length,
      sabine: absorcao.map((a, i) => (a + ar[i] > 0 ? (0.161 * V) / (a + ar[i]) : null)),
      eyring: alfa.map((a, i) => {
        if (a >= 1) return null
        const den = ar[i] - S * Math.log(1 - a)
        return den > 0 ? (0.161 * V) / den : null
      }),
    }
  }

  const estados = estadosAvaliados(c)
  const estadoAlfaMedio = estados.reduce((m, e) => (porEstado[e].alfaMedio > porEstado[m].alfaMedio ? e : m), estados[0])
  const alfaMedioSala = porEstado[estadoAlfaMedio].alfaMedio
  const formula: Formula = alfaMedioSala > LIMITE_EYRING ? 'eyring' : 'sabine'
  const tempo = Object.fromEntries(ESTADOS.map((e) => [e, porEstado[e][formula]])) as Resultado['tempo']
  return { areaTotal: S, porEstado, estados, alfaMedioSala, estadoAlfaMedio, formula, tempo }
}

export type SituacaoBanda = 'ok' | 'acima' | 'abaixo' | 'invalido'

/** Atende: todas as bandas avaliadas dentro das margens. Parcialmente: mais da metade delas. */
export type Situacao = 'atende' | 'parcial' | 'nao'
export const NOME_SITUACAO: Record<Situacao, string> = { atende: 'Atende', parcial: 'Atende parcialmente', nao: 'Não atende' }

export const situacaoDasBandas = (bandasOk: boolean[]): Situacao => {
  const ok = bandasOk.filter(Boolean).length
  return ok === bandasOk.length ? 'atende' : ok > bandasOk.length / 2 ? 'parcial' : 'nao'
}

export type Avaliacao =
  | { tipo: 'tempo'; meta: Extract<MetaCriterio, { tipo: 'tempo' }>; resultado: Resultado; bandas: Record<EstadoOcupacao, SituacaoBanda[]>; aprovado: boolean; situacao: Situacao }
  | { tipo: 'absorcao'; meta: Extract<MetaCriterio, { tipo: 'absorcao' }>; resultado: Resultado; av: PorBanda; bandas: SituacaoBanda[]; aprovado: boolean; situacao: Situacao }

export function avaliar(c: Cenario, cat: Catalogo): Avaliacao {
  const resultado = calcular(c, cat)
  const meta = metaDoCriterio(c.criterio, c.volume, c.peDireito)
  if (meta.tipo === 'absorcao') {
    const av = porBanda((i) => resultado.porEstado.cheio.absorcao[i] / c.volume)
    const bandas = av.map((v, i): SituacaoBanda => (!BANDAS_GRUPO_B.includes(i) || v >= meta.avMinimo ? 'ok' : 'abaixo'))
    const s = situacaoDasBandas(BANDAS_GRUPO_B.map((i) => bandas[i] === 'ok'))
    return { tipo: 'absorcao', meta, resultado, av, bandas, aprovado: s === 'atende', situacao: s }
  }
  const bandas = {} as Record<EstadoOcupacao, SituacaoBanda[]>
  for (const e of ESTADOS) {
    bandas[e] = resultado.tempo[e].map((t, i) => (t === null ? 'invalido' : t > meta.superior[i] ? 'acima' : t < meta.inferior[i] ? 'abaixo' : 'ok'))
  }
  // Uma banda conta como dentro das margens quando está dentro em todas as ocupações avaliadas.
  const s = situacaoDasBandas(BANDAS.map((_, i) => resultado.estados.every((e) => bandas[e][i] === 'ok')))
  return { tipo: 'tempo', meta, resultado, bandas, aprovado: s === 'atende', situacao: s }
}

export type Dimensionamento =
  | { encontrado: true; minimo: number; maximo: number; semLimiteSuperior: boolean }
  | { encontrado: false; motivo: 'insuficiente' | 'desequilibrado'; limite: number }

/**
 * Varre a quantidade de um item (área de um revestimento ou elemento, ou quantidade de nuvens e baffles)
 * e devolve a faixa que atende ao critério com os demais itens do cenário.
 */
export function dimensionar(c: Cenario, cat: Catalogo, alvo: { superficie: string } | { item: string }): Dimensionamento {
  const copia: Cenario = structuredClone(c)
  let limite: number, passo: number, aplicar: (q: number) => void
  if ('superficie' in alvo) {
    const s = copia.superficies.find((x) => x.id === alvo.superficie)!
    limite = Math.max(0, areaLivre(copia, s.base!, s.id))
    passo = Math.max(0.5, Math.round((limite / 150) * 2) / 2)
    aplicar = (q) => { s.modo = 'area'; s.area = q }
  } else {
    const it = copia.itens.find((x) => x.id === alvo.item)!
    limite = 300
    passo = 1
    aplicar = (q) => { it.quantidade = q }
  }
  let minimo: number | null = null, maximo = 0
  let ultima: Avaliacao | null = null
  for (let q = 0; q <= limite + 1e-9; q += passo) {
    aplicar(q)
    ultima = avaliar(copia, cat)
    if (ultima.aprovado) { if (minimo === null) minimo = q; maximo = q }
  }
  if (minimo !== null) return { encontrado: true, minimo, maximo, semLimiteSuperior: ultima?.tipo === 'absorcao' }
  const acima = !ultima || ultima.tipo === 'absorcao' || Object.values(ultima.bandas).some((b) => b.includes('acima'))
  return { encontrado: false, motivo: acima ? 'insuficiente' : 'desequilibrado', limite }
}
