import type { ReactNode } from 'react'
import { avaliar } from '../motor/acustica'
import { metaDoCriterio } from '../motor/criterios'
import type { Catalogo } from '../motor/materiais'
import type { Projeto } from '../motor/tipos'
import { quando } from '../ui/formato'
import { Icone } from '../ui/Icone'
import { ImagemProjeto } from '../ui/ImagemProjeto'

function situacoes(p: Projeto, catalogo: Catalogo) {
  return p.cenarios.map((c) => {
    try { return avaliar(c, catalogo).situacao } catch { return 'nao' as const }
  })
}

export function CartaoProjeto({ projeto, catalogo, abrir, acoes }: { projeto: Projeto; catalogo: Catalogo; abrir: () => void; acoes?: ReactNode }) {
  const sit = situacoes(projeto, catalogo)
  const atendem = sit.filter((s) => s === 'atende').length
  const parciais = sit.filter((s) => s === 'parcial').length
  const n = projeto.cenarios.length
  const c = projeto.cenarios[0]
  const classificacao = metaDoCriterio(c.criterio, c.volume, c.peDireito).nome
  return (
    <article className="cartao-projeto">
      <button type="button" className="cartao-projeto-abrir" onClick={abrir}>
        <span className="cartao-projeto-imagem">
          <ImagemProjeto projeto={projeto} />
          <span className={`etiqueta ${atendem === n ? 'ok' : atendem || parciais ? 'parcial' : 'ruim'}`}>{atendem}/{n} {n === 1 ? 'atende' : 'atendem'}{parciais ? ` · ${parciais} ${parciais === 1 ? 'parcial' : 'parciais'}` : ''}</span>
          <span className="seta-canto"><Icone nome="seta" tamanho={16} /></span>
        </span>
        <span className="cartao-projeto-corpo">
          <b className="cartao-projeto-nome">{projeto.nome}</b>
          <span className="cartao-projeto-info">
            <span><Icone nome="copiar" tamanho={14} />{n} {n === 1 ? 'cenário' : 'cenários'}</span>
            <span className="nota">Atualizado {quando(projeto.atualizadoEm)}</span>
          </span>
          <span className="classificacao">{classificacao}</span>
        </span>
      </button>
      {acoes && <div className="cartao-projeto-acoes">{acoes}</div>}
    </article>
  )
}
