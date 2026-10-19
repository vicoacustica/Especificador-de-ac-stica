// Armazenamento de projetos. Por enquanto fica no navegador; a conta da comunidade
// (login e projetos na nuvem) entra depois implementando a mesma interface.
import type { Projeto } from '../motor/tipos'

export interface RepositorioProjetos {
  listar(): Projeto[]
  salvar(projeto: Projeto): void
  excluir(id: string): void
}

const CHAVE = 'especificador:projetos:v1'

export class RepositorioLocal implements RepositorioProjetos {
  listar(): Projeto[] {
    try {
      const texto = localStorage.getItem(CHAVE)
      const lista = texto ? (JSON.parse(texto) as Projeto[]) : []
      return Array.isArray(lista) ? lista : []
    } catch {
      return []
    }
  }

  salvar(projeto: Projeto): void {
    const lista = this.listar().filter((p) => p.id !== projeto.id)
    this.gravar([{ ...projeto, atualizadoEm: new Date().toISOString() }, ...lista])
  }

  excluir(id: string): void {
    this.gravar(this.listar().filter((p) => p.id !== id))
  }

  private gravar(lista: Projeto[]) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(lista))
    } catch {
      // Sem armazenamento (janela privada, cota cheia): o projeto continua aberto, só não fica salvo.
    }
  }
}
