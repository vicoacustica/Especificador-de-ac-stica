// Modelo de dados do especificador: projeto → cenários → superfícies e itens de ocupação.

export const BANDAS = [125, 250, 500, 1000, 2000, 4000] as const

/** Valor por banda de oitava, na ordem de BANDAS. */
export type PorBanda = [number, number, number, number, number, number]

export interface Material {
  id: string
  nome: string
  /** Categoria, como na coluna TIPO DE MATERIAL da planilha. */
  tipo: string
  alfa: PorBanda
  /** Absorção em m² Sabine por peça, em vez de coeficiente por m². */
  unidade: boolean
  /** Criado pelo usuário. */
  proprio?: boolean
}

export type CategoriaSuperficie = 'piso' | 'parede' | 'teto' | 'revestimento' | 'esquadria' | 'elemento'

export const CATEGORIAS: Record<CategoriaSuperficie, { nome: string; base: boolean }> = {
  piso: { nome: 'Piso', base: true },
  parede: { nome: 'Parede', base: true },
  teto: { nome: 'Forro/teto', base: true },
  revestimento: { nome: 'Revestimento', base: false },
  esquadria: { nome: 'Esquadria', base: false },
  elemento: { nome: 'Elemento sobre superfície', base: false },
}

export interface Superficie {
  id: string
  nome: string
  categoria: CategoriaSuperficie
  /** Superfície base de onde a área é descontada (revestimentos, esquadrias e elementos). */
  base?: string
  modo: 'area' | 'dimensoes'
  /** Área em m² quando modo = 'area'. */
  area: number
  largura?: number
  altura?: number
  material: string
}

export type TipoItem = 'assento' | 'publico' | 'suspenso'

export interface ItemOcupacao {
  id: string
  tipo: TipoItem
  nome: string
  quantidade: number
  /** Assento vazio, pessoa do público ou nuvem/baffle. */
  material: string
  /** Só para assentos: material do assento ocupado. */
  materialOcupado?: string
}

export type EstadoOcupacao = 'vazio' | 'meio' | 'cheio'
export const ESTADOS: EstadoOcupacao[] = ['vazio', 'meio', 'cheio']
export const FRACAO_OCUPADA: Record<EstadoOcupacao, number> = { vazio: 0, meio: 0.5, cheio: 1 }
export const NOME_ESTADO: Record<EstadoOcupacao, string> = { vazio: '0%', meio: '50%', cheio: '100%' }

export type GrupoA = 'A1' | 'A2' | 'A3' | 'A4' | 'A5'
export type GrupoB = 'B2' | 'B3' | 'B4' | 'B5'
export type CurvaNBR = 'igreja' | 'concerto' | 'musica' | 'conferencia' | 'palavra'

export type Criterio =
  | { norma: 'A'; grupo: GrupoA }
  | { norma: 'B'; grupo: GrupoB }
  | { norma: 'NBR'; curva: CurvaNBR }

export type Umidade = 0 | 40 | 50 | 60

export interface Cenario {
  id: string
  nome: string
  criterio: Criterio
  /** Volume (V) em m³. */
  volume: number
  /** Pé-direito (h) em m, usado no grupo B. */
  peDireito: number
  /** Umidade relativa do ar em %; 0 desconsidera a absorção do ar. */
  umidade: Umidade
  ocupacoes: Record<EstadoOcupacao, boolean>
  superficies: Superficie[]
  itens: ItemOcupacao[]
}

export interface Projeto {
  id: string
  nome: string
  cenarios: Cenario[]
  materiaisProprios: Material[]
  atualizadoEm: string
}

export type Formula = 'sabine' | 'eyring'
