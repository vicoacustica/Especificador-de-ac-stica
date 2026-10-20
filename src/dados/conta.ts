// Dados da conta do usuário guardados no navegador: perfil e biblioteca de materiais.
// Quando o login da comunidade entrar, estes dados passam a vir da nuvem.
import type { Material } from '../motor/tipos'

export interface Perfil {
  nome: string
  email: string
  empresa: string
  profissao: string
  /** Link de uma pasta pública do Pinterest para o carrossel de inspirações. */
  pinterest: string
}

export interface Biblioteca {
  /** Materiais criados pelo usuário, disponíveis em todos os projetos. */
  proprios: Material[]
  /** Imagens enviadas pelo usuário, por id de material (próprio ou da base). */
  imagens: Record<string, string>
  /** Materiais da base que o usuário removeu da biblioteca (somem da escolha, mas podem ser restaurados). */
  ocultos: string[]
}

const CHAVE_PERFIL = 'especificador:perfil:v1'
const CHAVE_BIBLIOTECA = 'especificador:biblioteca:v1'

function ler<T>(chave: string, padrao: T): T {
  try {
    const texto = localStorage.getItem(chave)
    return texto ? { ...padrao, ...JSON.parse(texto) } : padrao
  } catch {
    return padrao
  }
}

/** Grava e devolve false quando o navegador recusa (cota cheia ou armazenamento bloqueado). */
function gravar(chave: string, valor: unknown): boolean {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}

export const PERFIL_VAZIO: Perfil = { nome: '', email: '', empresa: '', profissao: '', pinterest: '' }

export const lerPerfil = () => ler(CHAVE_PERFIL, PERFIL_VAZIO)
export const salvarPerfil = (p: Perfil) => gravar(CHAVE_PERFIL, p)
export const lerBiblioteca = () => ler<Biblioteca>(CHAVE_BIBLIOTECA, { proprios: [], imagens: {}, ocultos: [] })
export const salvarBiblioteca = (b: Biblioteca) => gravar(CHAVE_BIBLIOTECA, b)
