import { useMemo, useState } from 'react'
import { areaEfetiva, avaliar, NOME_SITUACAO } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import type { Projeto } from '../motor/tipos'
import { coresDoCenario, facesDoModelo } from '../importacao/cena'
import { Visor3D } from '../importacao/Visor3D'
import { CLASSE_SITUACAO, fmt } from '../ui/formato'

/** Modelo 3D pintado pelos materiais de cada cenário, com legenda e troca de cenário. */
export function ModeloResultado({ projeto, catalogo }: { projeto: Projeto; catalogo: Catalogo }) {
  const comModelo = projeto.cenarios.filter((c) => Object.keys(c.grupos ?? {}).length)
  const [id, setId] = useState(comModelo[0]?.id)
  const faces = useMemo(() => (projeto.modelo ? facesDoModelo(projeto.modelo) : []), [projeto.modelo])
  const [destaque, setDestaque] = useState<string | null>(null)
  if (!projeto.modelo || !comModelo.length) return null
  const cenario = comModelo.find((c) => c.id === id) ?? comModelo[0]
  const { cor, cores, superficieDo } = coresDoCenario(cenario)
  const situacao = avaliar(cenario, catalogo).situacao

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
          <span className={`pill ${CLASSE_SITUACAO[situacao]}`}>{cenario.nome}: {NOME_SITUACAO[situacao]}</span>
          <ul>
            {[...legenda.entries()].map(([mat, l]) => (
              <li key={mat} onMouseEnter={() => setDestaque(mat)}>
                <i className="sw" style={{ background: cores.get(mat) }} />
                <span><b>{catalogo.get(mat).nome}</b><small>{fmt(l.area)} m²</small></span>
              </li>
            ))}
          </ul>
          <p className="nota">Passe o mouse num material para isolá-lo no modelo.</p>
        </div>
      </div>
    </section>
  )
}
