// Base de materiais da aba MATERIAIS da PLANILHA_TR, mais os materiais criados pelo usuário.
import dados from '../dados/materiais.json'
import type { Material, PorBanda, Umidade } from './tipos'

interface Bruto { id: string; nome: string; tipo: string; alfa: number[] }

const brutos = dados as Bruto[]

function normalizarTipo(tipo: string): string {
  if (!tipo || tipo === 'None') return 'SEM CATEGORIA'
  return tipo.replace(/^ACÚSTIC - /, 'ACÚSTICO - ')
}

/** Absorção do ar (m, em m⁻¹) por umidade relativa, das linhas "Ar" da planilha. */
export const ABSORCAO_AR: Record<Umidade, PorBanda> = {
  0: [0, 0, 0, 0, 0, 0],
  40: brutos.find((m) => m.id === 'ar-umidade-relativa-40')!.alfa as PorBanda,
  50: brutos.find((m) => m.id === 'ar-umidade-relativa-50')!.alfa as PorBanda,
  60: brutos.find((m) => m.id === 'ar-umidade-relativa-60')!.alfa as PorBanda,
}

/** Materiais da planilha. Nomes repetidos ganham "(variante n)" para ficarem distinguíveis. */
export const MATERIAIS_BASE: Material[] = (() => {
  const vistos = new Map<string, number>()
  return brutos
    .filter((m) => m.tipo !== 'AR')
    .map((m) => {
      const n = (vistos.get(m.nome) ?? 0) + 1
      vistos.set(m.nome, n)
      return {
        id: m.id,
        nome: n > 1 ? `${m.nome} (variante ${n})` : m.nome,
        tipo: normalizarTipo(m.tipo),
        alfa: m.alfa as PorBanda,
        unidade: /\(.*UNIDADE.*\)/i.test(m.nome),
      }
    })
})()

/** NRC pela definição usual: média de α em 250, 500, 1000 e 2000 Hz, arredondada a 0,05. */
export const nrcCalculado = (alfa: PorBanda) => Math.round((alfa[1] + alfa[2] + alfa[3] + alfa[4]) / 4 / 0.05) * 0.05

/** Materiais com coeficiente (α) sem NRC informado recebem o NRC calculado. Materiais por peça não têm NRC. */
const comNrc = (m: Material): Material => (m.unidade || m.nrc !== undefined ? m : { ...m, nrc: nrcCalculado(m.alfa), nrcEstimado: true })

export class Catalogo {
  private porId: Map<string, Material>
  /** Materiais disponíveis para escolha: não inclui os da base que o usuário removeu da biblioteca. */
  readonly todos: Material[]
  readonly ocultos: Material[]

  /** Base da planilha, materiais próprios do usuário, as imagens que ele enviou e os ids da base que ele removeu. */
  constructor(proprios: Material[] = [], imagens: Record<string, string> = {}, ocultos: string[] = []) {
    const vistos = new Set<string>()
    const lista = [...MATERIAIS_BASE, ...proprios]
      .filter((m) => (vistos.has(m.id) ? false : (vistos.add(m.id), true)))
      .map((m) => comNrc(imagens[m.id] ? { ...m, imagem: imagens[m.id] } : m))
    const fora = new Set(ocultos)
    this.todos = lista.filter((m) => m.proprio || !fora.has(m.id))
    this.ocultos = lista.filter((m) => !m.proprio && fora.has(m.id))
    // Projetos antigos podem usar um material removido: ele continua resolvível pelo id.
    this.porId = new Map(lista.map((m) => [m.id, m]))
  }

  get(id: string): Material {
    const m = this.porId.get(id)
    if (!m) throw new Error(`Material desconhecido: ${id}`)
    return m
  }

  /** Busca pelo nome exato, como o PROCV da planilha: devolve a primeira ocorrência. */
  porNome(nome: string): Material {
    const m = this.todos.find((x) => x.nome === nome) ?? this.ocultos.find((x) => x.nome === nome)
    if (!m) throw new Error(`Material desconhecido: ${nome}`)
    return m
  }

  categorias(): string[] {
    return [...new Set(this.todos.map((m) => m.tipo))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }
}

export const TIPOS_OCUPACAO = ['PÚBLICO', 'ASSENTOS']
export const TIPOS_SUSPENSOS = ['ACÚSTICO - NUVEM/BAFFLE', 'ACÚSTICO - BAFFLE']

/** Superfícies não aceitam ocupação, nuvens e baffles nem materiais com absorção por unidade. */
export const paraSuperficie = (m: Material) => !m.unidade && !TIPOS_OCUPACAO.includes(m.tipo) && !TIPOS_SUSPENSOS.includes(m.tipo)
export const assentoVazio = (m: Material) => m.tipo === 'ASSENTOS' && !/CHEIA/i.test(m.nome)
export const assentoOcupado = (m: Material) => m.tipo === 'PÚBLICO' || (m.tipo === 'ASSENTOS' && /CHEIA/i.test(m.nome))
export const publico = (m: Material) => m.tipo === 'PÚBLICO'
export const suspenso = (m: Material) => TIPOS_SUSPENSOS.includes(m.tipo) || (!!m.proprio && m.unidade && !TIPOS_OCUPACAO.includes(m.tipo))

export function nomeCategoria(tipo: string): string {
  const t = tipo.replace(/^ACÚSTICO - /, '').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
