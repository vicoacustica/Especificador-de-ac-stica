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
  /** Foto ou textura do material (data URL), enviada pelo usuário. */
  imagem?: string
  /** Texto livre do usuário: fabricante, espessura, montagem, laudo. */
  descricao?: string
  /** Coeficiente de redução de ruído (NRC) informado pelo usuário. Só informativo, não entra no cálculo. */
  nrc?: number
  /** O NRC foi calculado pelo catálogo (média de α em 250 a 2000 Hz), não informado. Não é gravado. */
  nrcEstimado?: boolean
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
  /** Só paredes base: par de paredes paralelas a que pertence, usado na fórmula de Fitzroy. */
  eixo?: EixoParede
  /** Com eixo 'xy': fração da área no par x (0 a 1); o resto vai para o par y. */
  fracaoX?: number
}

/** Paredes ao longo do comprimento (x), da largura (y) ou dos dois pares (xy), como "Paredes" em uma só superfície. */
export type EixoParede = 'x' | 'y' | 'xy'

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
  /** Nuvens e baffles com coeficiente de absorção (α): a área total vem do formato, das medidas e da quantidade de peças. */
  forma?: Forma
  /** Só para itens suspensos: nuvem (plana, uma face) ou baffle (vertical, base e duas laterais). */
  elemento?: Elemento
}

export type Elemento = 'nuvem' | 'baffle'
export type TipoForma = 'quadrado' | 'retangulo' | 'circulo' | 'triangulo' | 'trapezio' | 'baffle'

export interface Forma {
  tipo: TipoForma
  /** Medidas em m, na ordem de FORMAS[tipo].medidas. */
  medidas: number[]
  quantidade: number
}

/** Formatos usuais de nuvens (área de uma face) e o baffle (base e duas laterais). */
export const FORMAS: Record<TipoForma, { nome: string; medidas: string[]; area: (m: number[]) => number }> = {
  quadrado: { nome: 'Quadrado', medidas: ['Lado (L)'], area: ([l]) => l * l },
  retangulo: { nome: 'Retângulo', medidas: ['Largura (L)', 'Comprimento (C)'], area: ([l, c]) => l * c },
  circulo: { nome: 'Círculo', medidas: ['Diâmetro (D)'], area: ([d]) => (Math.PI * d * d) / 4 },
  triangulo: { nome: 'Triângulo', medidas: ['Base (b)', 'Altura (h)'], area: ([b, h]) => (b * h) / 2 },
  trapezio: { nome: 'Trapézio', medidas: ['Base maior (B)', 'Base menor (b)', 'Altura (h)'], area: ([B, b, h]) => ((B + b) * h) / 2 },
  baffle: { nome: 'Baffle', medidas: ['Comprimento (C)', 'Largura (L)', 'Altura (H)'], area: ([c, l, h]) => c * l + 2 * c * h },
}
/** Itens antigos não guardam o tipo de elemento: o nome decide. */
export const elementoDe = (it: ItemOcupacao): Elemento => it.elemento ?? (/baffle/i.test(it.nome) ? 'baffle' : 'nuvem')
export const FORMAS_NUVEM: TipoForma[] = ['quadrado', 'retangulo', 'circulo', 'triangulo', 'trapezio']

/** Área total (m²) das peças: área de cada peça × quantidade. */
export const areaDaForma = (f: Forma) => FORMAS[f.tipo].area(f.medidas) * f.quantidade

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
  /** Tempo ótimo (s) e margens por banda em %, definidos pelo projetista: limites T·(1 + superior/100) e T·(1 − inferior/100). */
  | { norma: 'personalizado'; t: number; superior: PorBanda; inferior: PorBanda }

export type Umidade = 0 | 40 | 50 | 60

export interface Cenario {
  id: string
  nome: string
  /** Critério principal: usado no dimensionamento, no memorial e no cartão do projeto. */
  criterio: Criterio
  /** Critérios complementares, avaliados com os mesmos resultados (ex.: grupo B5 e NBR conferência em um restaurante). */
  criteriosExtras?: Criterio[]
  /** Fórmula do tempo de reverberação; 'auto' (padrão) escolhe pela distribuição e pela quantidade de absorção. */
  formula?: EscolhaFormula
  /** Volume (V) em m³. */
  volume: number
  /** Pé-direito (h) em m, usado no grupo B. */
  peDireito: number
  /** Umidade relativa do ar em %; 0 desconsidera a absorção do ar. */
  umidade: Umidade
  ocupacoes: Record<EstadoOcupacao, boolean>
  superficies: Superficie[]
  itens: ItemOcupacao[]
  /** Superfície de cada grupo do modelo 3D (id da superfície por grupo). */
  grupos?: Record<string, string>
  /** Fonte, receptor e elementos desenhados no traçado de raios. */
  raios?: TracadoRaios
}

export type VistaRaios = 'planta' | 'longitudinal' | 'transversal'

/** Elemento refletor desenhado em uma vista do traçado de raios, em coordenadas da vista (m). */
export interface ElementoRaio {
  id: string
  vista: VistaRaios
  a: [number, number]
  b: [number, number]
  material: string
}

export interface TracadoRaios {
  /** Posições x, y, z em metros. */
  fonte: [number, number, number]
  receptor: [number, number, number]
  elementos: ElementoRaio[]
  /** Sem modelo 3D: medidas em planta da sala retangular de referência (m). */
  caixa?: { comprimento: number; largura: number }
}

export interface Projeto {
  id: string
  nome: string
  cenarios: Cenario[]
  materiaisProprios: Material[]
  atualizadoEm: string
  /** Imagem de capa enviada pelo usuário (data URL). */
  imagem?: string
  /** Geometria do modelo 3D importado, compartilhada pelos cenários. */
  modelo?: ModeloProjeto
}

export interface ModeloProjeto {
  arquivo: string
  /** Faces em metros: g é o grupo (linha do quadro de importação) e p os pontos x, y, z em sequência. */
  faces: { g: string; p: number[] }[]
}

export type Formula = 'sabine' | 'eyring' | 'fitzroy'
export type EscolhaFormula = 'auto' | Formula
export const NOME_FORMULA: Record<Formula, string> = { sabine: 'Sabine', eyring: 'Eyring', fitzroy: 'Fitzroy' }
