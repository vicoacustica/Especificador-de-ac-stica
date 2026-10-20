import type { ReactNode } from 'react'
import { avaliar, type Avaliacao } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import type { Projeto } from '../motor/tipos'
import { fmt, quando } from '../ui/formato'
import { Icone } from '../ui/Icone'

function resumoProjeto(p: Projeto, catalogo: Catalogo) {
  const avaliacoes = p.cenarios.map((c) => {
    try { return avaliar(c, catalogo) } catch { return null }
  })
  const atendem = avaliacoes.filter((a) => a?.aprovado).length
  return { avaliacoes, atendem, principal: avaliacoes[0] }
}

/** Curva do tempo de reverberação (T) com 100% de ocupação dentro da faixa aceita, em miniatura. */
function MiniCurva({ av }: { av: Avaliacao }) {
  const W = 120, H = 44
  if (av.tipo === 'absorcao') {
    const max = Math.max(av.meta.avMinimo * 1.5, ...av.av)
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
        <line x1={0} x2={W} y1={H - (av.meta.avMinimo / max) * H} y2={H - (av.meta.avMinimo / max) * H} stroke="var(--ink-3)" strokeDasharray="3 3" />
        {av.av.map((v, i) => <rect key={i} x={i * 20 + 4} y={H - (v / max) * H} width={12} height={(v / max) * H} rx={3} fill={i >= 1 && i <= 4 ? 'var(--accent)' : 'var(--line-2)'} />)}
      </svg>
    )
  }
  const est = av.resultado.estados[av.resultado.estados.length - 1]
  const t = av.resultado.tempo[est].map((v) => v ?? 0)
  const max = Math.max(...av.meta.superior, ...t) * 1.1
  const x = (i: number) => 6 + i * ((W - 12) / 5)
  const y = (v: number) => H - 3 - (Math.min(v, max) / max) * (H - 6)
  const pts = (vals: number[]) => vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <polygon points={`${pts(av.meta.superior)} ${[...av.meta.inferior].map((v, i) => `${x(i)},${y(v)}`).reverse().join(' ')}`} fill="var(--band)" />
      <polyline points={pts(t)} fill="none" stroke="var(--accent)" strokeWidth={2.2} strokeLinejoin="round" />
    </svg>
  )
}

export function CartaoProjeto({ projeto, catalogo, abrir, acoes }: { projeto: Projeto; catalogo: Catalogo; abrir: () => void; acoes?: ReactNode }) {
  const { atendem, principal } = resumoProjeto(projeto, catalogo)
  const c = projeto.cenarios[0]
  const todos = atendem === projeto.cenarios.length
  return (
    <article className="cartao-projeto">
      <button type="button" className="cartao-projeto-abrir" onClick={abrir}>
        <span className="cartao-projeto-topo">
          <span className={`etiqueta ${todos ? 'ok' : atendem ? 'parcial' : 'ruim'}`}>{atendem}/{projeto.cenarios.length} {projeto.cenarios.length === 1 ? 'cenário atende' : 'cenários atendem'}</span>
          <span className="seta-canto"><Icone nome="seta" tamanho={16} /></span>
        </span>
        <b className="cartao-projeto-nome">{projeto.nome}</b>
        <span className="suave">{principal ? principal.meta.nome : 'Sem cálculo'}</span>
        <span className="cartao-projeto-base">
          <span className="cartao-projeto-dados">
            <span><small>Volume (V)</small><b>{fmt(c.volume, 0)} m³</b></span>
            {principal?.tipo === 'tempo' && <span><small>{principal.meta.otimo ? 'T ótimo' : 'T alvo'}</small><b>{fmt(principal.meta.t)} s</b></span>}
            {principal?.tipo === 'absorcao' && <span><small>A/V mínimo</small><b>{fmt(principal.meta.avMinimo, 2)}</b></span>}
          </span>
          {principal && <MiniCurva av={principal} />}
        </span>
        <span className="nota">Atualizado {quando(projeto.atualizadoEm)}{todos ? '' : ' · revisar'}</span>
      </button>
      {acoes && <div className="cartao-projeto-acoes">{acoes}</div>}
    </article>
  )
}
