import { Catalogo } from '../motor/materiais'
import type { Cenario, Projeto } from '../motor/tipos'

let contador = 0
export const novoId = () => `${Date.now().toString(36)}-${(contador++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`

const cat = new Catalogo()
const id = (nome: string) => cat.porNome(nome).id

export function cenarioVazio(nome: string): Cenario {
  return {
    id: novoId(), nome, criterio: { norma: 'A', grupo: 'A3' }, volume: 100, peDireito: 3, umidade: 50,
    ocupacoes: { vazio: true, meio: true, cheio: true }, superficies: [], itens: [],
  }
}

/** Duplica um cenário trocando todos os ids, inclusive as referências às superfícies base. */
export function duplicarCenario(c: Cenario, nome: string): Cenario {
  const n: Cenario = structuredClone(c)
  n.id = novoId()
  n.nome = nome
  const mapa = new Map(n.superficies.map((s) => [s.id, novoId()]))
  n.superficies = n.superficies.map((s) => ({ ...s, id: mapa.get(s.id)!, base: s.base ? mapa.get(s.base) : undefined }))
  n.itens = n.itens.map((it) => ({ ...it, id: novoId() }))
  return n
}

/** Projeto de exemplo: sala de aula com forro acústico e uma alternativa com nuvens. */
export function projetoExemplo(): Projeto {
  const piso = novoId(), teto = novoId(), paredes = novoId()
  const forro: Cenario = {
    id: novoId(), nome: 'Forro acústico', criterio: { norma: 'A', grupo: 'A3' }, volume: 189, peDireito: 3, umidade: 50,
    ocupacoes: { vazio: true, meio: true, cheio: true },
    superficies: [
      { id: piso, nome: 'Piso', categoria: 'piso', modo: 'dimensoes', area: 63, largura: 9, altura: 7, material: id('LAJOTA CERÂMICA') },
      { id: teto, nome: 'Laje do teto', categoria: 'teto', modo: 'dimensoes', area: 63, largura: 9, altura: 7, material: id('GESSO LISO') },
      { id: paredes, nome: 'Paredes', categoria: 'parede', modo: 'area', area: 96, material: id('ALVENARIA LISA OU PINTADA') },
      { id: novoId(), nome: 'Janelas', categoria: 'esquadria', base: paredes, modo: 'dimensoes', area: 9.6, largura: 8, altura: 1.2, material: id('VIDRO COMUM') },
      { id: novoId(), nome: 'Porta', categoria: 'esquadria', base: paredes, modo: 'dimensoes', area: 1.89, largura: 0.9, altura: 2.1, material: id('MADEIRA PINTADA OU ENVERNIZADA') },
      { id: novoId(), nome: 'Forro acústico', categoria: 'revestimento', base: teto, modo: 'area', area: 53, material: id('AMBI CFQ 18X18 FORRO') },
    ],
    itens: [
      { id: novoId(), tipo: 'assento', nome: 'Carteiras', quantidade: 40, material: id('Cadeira com encosto e assento contraplacado (UNIDADE)'), materialOcupado: id('ADULTO SENTADO INCLUINDO CADEIRA (UNIDADE)') },
    ],
  }
  const nuvens = duplicarCenario(forro, 'Nuvens no teto')
  nuvens.superficies = nuvens.superficies.filter((s) => s.nome !== 'Forro acústico')
  nuvens.itens.push({ id: novoId(), tipo: 'suspenso', nome: 'Nuvens', quantidade: 18, material: id('TRISOFT NUVEM CLÁSSICA 1200X1200X50MM (POR UNIDADE)') })
  return { id: novoId(), nome: 'Sala de aula · exemplo', cenarios: [forro, nuvens], materiaisProprios: [], atualizadoEm: new Date().toISOString() }
}
