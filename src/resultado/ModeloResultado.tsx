import { useMemo, useState } from 'react'
import { areaEfetiva } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import { elementoDe, FORMAS, type Cenario, type ItemOcupacao, type Projeto } from '../motor/tipos'
import { coresDoCenario, facesDoModelo } from '../importacao/cena'
import { Visor3D } from '../importacao/Visor3D'
import { fmt } from '../ui/formato'

const GRUPOS_ITENS: { titulo: string; filtro: (it: ItemOcupacao) => boolean }[] = [
  { titulo: 'Mobiliário', filtro: (it) => it.tipo === 'assento' },
  { titulo: 'Nuvens', filtro: (it) => it.tipo === 'suspenso' && elementoDe(it) === 'nuvem' },
  { titulo: 'Baffles', filtro: (it) => it.tipo === 'suspenso' && elementoDe(it) === 'baffle' },
]

/** Quantidade do item: peças, ou área total com as peças e medidas para os itens com α. */
function quantidadeDoItem(it: ItemOcupacao, catalogo: Catalogo): string {
  if (it.tipo !== 'suspenso' || catalogo.get(it.material).unidade) return `${it.quantidade} un.`
  const f = it.forma
  return f ? `${fmt(it.quantidade)} m² · ${f.quantidade} × ${FORMAS[f.tipo].nome.toLowerCase()} ${f.medidas.map((m) => fmt(m)).join(' × ')} m` : `${fmt(it.quantidade)} m²`
}

/** Resumo do mobiliário, das nuvens e dos baffles do cenário (o público fica de fora). */
function ResumoItens({ cenario, catalogo }: { cenario: Cenario; catalogo: Catalogo }) {
  const grupos = GRUPOS_ITENS.map((g) => ({ ...g, itens: cenario.itens.filter(g.filtro) }))
  return (
    <div className="modelo-itens">
      {grupos.map((g) => (
        <div key={g.titulo}>
          <b className="k">{g.titulo}</b>
          {g.itens.length ? (
            <ul>
              {g.itens.map((it) => (
                <li key={it.id}><span><b>{it.nome}</b><small>{catalogo.get(it.material).nome}</small></span><span className="mono">{quantidadeDoItem(it, catalogo)}</span></li>
              ))}
            </ul>
          ) : <p className="suave">Nenhum item neste cenário.</p>}
        </div>
      ))}
    </div>
  )
}

/** Modelo 3D pintado pelos materiais de cada cenário, com legenda e troca de cenário. */
export function ModeloResultado({ projeto, catalogo }: { projeto: Projeto; catalogo: Catalogo }) {
  const comModelo = projeto.cenarios.filter((c) => Object.keys(c.grupos ?? {}).length)
  const [id, setId] = useState(comModelo[0]?.id)
  const faces = useMemo(() => (projeto.modelo ? facesDoModelo(projeto.modelo) : []), [projeto.modelo])
  const [destaque, setDestaque] = useState<string | null>(null)
  if (!projeto.modelo || !comModelo.length) return null
  const cenario = comModelo.find((c) => c.id === id) ?? comModelo[0]
  const { cor, cores, superficieDo } = coresDoCenario(cenario)

  // Legenda: materiais das superfícies ligadas ao modelo, com a área de cada um.
  const ligadas = new Set(Object.keys(cenario.grupos ?? {}).map((g) => superficieDo(g)?.id).filter(Boolean))
  const legenda = new Map<string, { area: number; grupos: string[] }>()
  for (const s of cenario.superficies.filter((x) => ligadas.has(x.id))) {
    const l = legenda.get(s.material) ?? { area: 0, grupos: [] }
    l.area += areaEfetiva(cenario, s)
    l.grupos.push(...Object.entries(cenario.grupos!).filter(([, v]) => v === s.id).map(([g]) => g))
    legenda.set(s.material, l)
  }
  const grupoDestacado = destaque ? legenda.get(destaque)?.grupos : undefined

  return (
    <section className="modelo-resultado">
      <div className="bloco-topo">
        <div>
          <h3>Modelo 3D</h3>
          <p className="nota">{projeto.modelo.arquivo} · materiais do cenário escolhido</p>
        </div>
        <div className="chips" role="group" aria-label="Cenário mostrado no modelo">
          {projeto.cenarios.map((c) => {
            const tem = comModelo.includes(c)
            return (
              <button key={c.id} type="button" className="chip" aria-pressed={c.id === cenario.id} disabled={!tem} title={tem ? undefined : 'Este cenário não tem superfícies ligadas ao modelo'} onClick={() => setId(c.id)}>{c.nome}</button>
            )
          })}
        </div>
      </div>
      <div className="modelo-resultado-corpo">
        <Visor3D
          faces={faces}
          cor={cor}
          destaque={grupoDestacado ?? null}
          rotulo={`Modelo 3D do cenário ${cenario.nome}`}
        />
        <div className="modelo-legenda" onMouseLeave={() => setDestaque(null)}>
          <ul>
            {[...legenda.entries()].map(([mat, l]) => (
              <li key={mat} onMouseEnter={() => setDestaque(mat)}>
                <i className="sw" style={{ background: cores.get(mat) }} />
                <span><b>{catalogo.get(mat).nome}</b><small>{fmt(l.area)} m²</small></span>
              </li>
            ))}
          </ul>
          <p className="nota">Passe o mouse em um material para isolá-lo no modelo.</p>
        </div>
      </div>
      <ResumoItens cenario={cenario} catalogo={catalogo} />
    </section>
  )
}
