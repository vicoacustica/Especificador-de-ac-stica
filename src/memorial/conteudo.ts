// Conteúdo do memorial: materiais acústicos especificados, com código, quantitativo e onde são aplicados.
import { areaEfetiva } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import { FORMAS, type Cenario, type Material } from '../motor/tipos'
import { fmt } from '../ui/formato'

/** Materiais comuns, assentos, público e ar não entram no memorial: só os acústicos. */
const NAO_ACUSTICOS = ['MATERIAL COMUM', 'ASSENTOS', 'PÚBLICO', 'AR', 'NONE', '']
export const ehAcustico = (m: Material) => !NAO_ACUSTICOS.includes(m.tipo.trim().toUpperCase())

export interface ItemEspecificacao {
  codigo: string
  material: Material
  quantidade: number
  unidade: 'm²' | 'un.'
  /** Superfícies e elementos onde o material é aplicado. */
  aplicacao: string[]
  /** Peças e medidas das nuvens e dos baffles. */
  pecas: string[]
}

/** Quadro de especificações do cenário: um código por material acústico e unidade (m² ou peças). */
export function especificacao(c: Cenario, cat: Catalogo): ItemEspecificacao[] {
  const itens = new Map<string, ItemEspecificacao>()
  const somar = (m: Material, unidade: ItemEspecificacao['unidade'], q: number, onde: string, peca?: string) => {
    const k = `${m.id}|${unidade}`
    const it = itens.get(k) ?? { codigo: '', material: m, quantidade: 0, unidade, aplicacao: [], pecas: [] }
    it.quantidade += q
    if (!it.aplicacao.includes(onde)) it.aplicacao.push(onde)
    if (peca) it.pecas.push(peca)
    itens.set(k, it)
  }
  for (const s of c.superficies) {
    const m = cat.get(s.material)
    const a = areaEfetiva(c, s)
    if (ehAcustico(m) && a > 0) somar(m, 'm²', a, s.nome)
  }
  for (const it of c.itens) {
    if (it.tipo !== 'suspenso') continue
    const m = cat.get(it.material)
    if (!ehAcustico(m) || it.quantidade <= 0) continue
    if (m.unidade) somar(m, 'un.', it.quantidade, it.nome, `${it.quantidade} peças (${it.nome})`)
    else {
      const f = it.forma
      somar(m, 'm²', it.quantidade, it.nome, f ? `${f.quantidade} × ${FORMAS[f.tipo].nome.toLowerCase()} ${f.medidas.map((x) => fmt(x)).join(' × ')} m (${it.nome})` : undefined)
    }
  }
  return [...itens.values()].map((it, i) => ({ ...it, codigo: `M${i + 1}` }))
}

export const quantidadeTexto = (it: ItemEspecificacao) => (it.unidade === 'm²' ? `${fmt(it.quantidade)} m²` : `${it.quantidade} un.`)
