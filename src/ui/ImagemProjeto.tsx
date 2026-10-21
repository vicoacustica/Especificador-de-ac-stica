import type { Projeto } from '../motor/tipos'
import { Icone } from './Icone'

/** Imagem enviada pelo usuário; sem ela, um espaço neutro que convida a enviar. */
export function ImagemProjeto({ projeto }: { projeto: Projeto }) {
  return (
    <span className="imagem-ambiente">
      {projeto.imagem ? <img src={projeto.imagem} alt={`Imagem do projeto ${projeto.nome}`} loading="lazy" /> : (
        <span className="imagem-vazia"><Icone nome="imagem" tamanho={22} /><small>Sem imagem</small></span>
      )}
    </span>
  )
}
