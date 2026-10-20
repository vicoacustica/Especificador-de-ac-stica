// Transforma as linhas escolhidas do quadro de áreas em superfícies do cenário.
import { ehBase, validarSuperficies } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import { CATEGORIAS, type Cenario, type CategoriaSuperficie, type Superficie } from '../motor/tipos'
import { novoId } from '../dados/exemplo'
import { orientacaoPrincipal, type LinhaQuadro, type Orientacao } from './modelo'

export type Destino = CategoriaSuperficie | 'ignorar'

/** Sugestão pelo nome da layer; sem pista no nome, vale a orientação com mais área. */
export function sugerirDestino(l: LinhaQuadro): Destino {
  const n = l.layer.toLowerCase()
  if (/porta|janela|vidr|esquadr|caixilh|door|window|glass|glaz/.test(n)) return 'esquadria'
  if (/acúst|acust|acoust|painel|panel|revest/.test(n)) return 'revestimento'
  if (/mobili|furn|movel|móvel|pessoa|people|cota|dim|text|hatch|eixo|axis/.test(n)) return 'ignorar'
  if (!l.orientacao) {
    if (/piso|chão|chao|floor|pavim/.test(n)) return 'piso'
    if (/forro|teto|laje|ceiling|roof|cobert/.test(n)) return 'teto'
    if (/parede|alvenar|wall|divis/.test(n)) return 'parede'
  }
  const o = orientacaoPrincipal(l)
  return o === 'inclinada' ? 'teto' : o
}

const MATERIAL_PADRAO: Record<CategoriaSuperficie, string> = {
  piso: 'LAJOTA CERÂMICA',
  parede: 'ALVENARIA LISA OU PINTADA',
  teto: 'GESSO LISO',
  revestimento: 'AMBI 16.1 PAREDE',
  esquadria: 'VIDRO COMUM',
  elemento: 'MADEIRA PINTADA OU ENVERNIZADA',
}
const BASE_DA_ORIENTACAO: Record<Orientacao, CategoriaSuperficie> = { piso: 'piso', parede: 'parede', teto: 'teto', inclinada: 'teto' }

export interface Escolha { linha: LinhaQuadro; destino: Destino }

export interface OpcoesImportacao {
  /** Troca as superfícies do cenário pelas importadas. */
  substituir: boolean
  /** As paredes do modelo já têm os vãos recortados: a área das esquadrias volta para a parede base. */
  vaosRecortados: boolean
}

const m2 = (x: number) => Math.round(x * 100) / 100

/** Devolve as novas superfícies do cenário, ou o motivo de não importar. */
export function aplicarImportacao(cenario: Cenario, escolhas: Escolha[], opcoes: OpcoesImportacao, catalogo: Catalogo): { superficies: Superficie[] } | { erro: string } {
  const material = (c: CategoriaSuperficie, nome: string) =>
    catalogo.porNome(c === 'esquadria' && /porta|door/i.test(nome) ? 'MADEIRA PINTADA OU ENVERNIZADA' : MATERIAL_PADRAO[c]).id
  const usadas = escolhas.filter((e) => e.destino !== 'ignorar' && m2(e.linha.total) > 0)
  if (!usadas.length) return { erro: 'Escolha ao menos uma layer para importar.' }

  const existentes = opcoes.substituir ? [] : structuredClone(cenario.superficies)
  const nova = (e: Escolha): Superficie => {
    const c = e.destino as CategoriaSuperficie
    return { id: novoId(), nome: e.linha.chave, categoria: c, modo: 'area', area: m2(e.linha.total), material: material(c, e.linha.layer) }
  }
  const bases = usadas.filter((e) => CATEGORIAS[e.destino as CategoriaSuperficie].base).map(nova)
  const todasBases = [...existentes.filter(ehBase), ...bases]
  if (!todasBases.length) return { erro: 'Importe ao menos uma superfície base (piso, parede ou forro/teto) para receber esquadrias e revestimentos.' }

  const itens: Superficie[] = []
  for (const e of usadas.filter((x) => !CATEGORIAS[x.destino as CategoriaSuperficie].base)) {
    // O item vai para a maior base com a mesma orientação; sem ela, para a maior base.
    const cat = BASE_DA_ORIENTACAO[orientacaoPrincipal(e.linha)]
    const candidatas = todasBases.filter((b) => b.categoria === cat)
    const base = (candidatas.length ? candidatas : todasBases).reduce((a, b) => (b.area > a.area ? b : a))
    const it = { ...nova(e), base: base.id }
    if (opcoes.vaosRecortados && it.categoria === 'esquadria' && bases.includes(base)) base.area = m2(base.area + it.area)
    itens.push(it)
  }

  // Cada base seguida dos seus itens, como na etapa de superfícies.
  const superficies: Superficie[] = [...existentes]
  for (const b of bases) superficies.push(b)
  for (const it of itens) {
    const ultimo = superficies.map((x) => x.id === it.base || x.base === it.base).lastIndexOf(true)
    superficies.splice(ultimo + 1, 0, it)
  }
  const problema = validarSuperficies({ ...cenario, superficies })[0]
  if (problema) {
    const b = superficies.find((s) => s.id === problema.superficie)!
    return { erro: `Os itens sobre “${b.nome}” somam mais que a área dela. Marque que os vãos já estão recortados no modelo, ou mude o destino de alguma layer.` }
  }
  return { superficies }
}
