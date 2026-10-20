import { useMemo, useState } from 'react'
import { areaEfetiva } from '../motor/acustica'
import { nomeCategoria, type Catalogo } from '../motor/materiais'
import { CATEGORIAS, type Cenario, type CategoriaSuperficie, type Material, type ModeloProjeto } from '../motor/tipos'
import { coresDoCenario, facesDoModelo } from '../importacao/cena'
import { Visor3D } from '../importacao/Visor3D'
import { fmt, resumoAbsorcao } from '../ui/formato'
import { Icone } from '../ui/Icone'
import { MiniaturaMaterial } from '../ui/MaterialVisual'

const LIMITE_LISTA = 80

interface Props {
  cenario: Cenario
  catalogo: Catalogo
  modelo: ModeloProjeto
  materiais: Material[]
  mudarMaterial: (superficie: string, material: string) => void
  mudarCategoria: (superficie: string, categoria: CategoriaSuperficie) => void
  erro: { id: string; texto: string } | null
}

/**
 * Superfícies sobre o modelo 3D importado: clique numa face para escolher a superfície e depois
 * num material, ou arraste o material da biblioteca até a face.
 */
export function SuperficiesNoModelo({ cenario, catalogo, modelo, materiais, mudarMaterial, mudarCategoria, erro }: Props) {
  const [grupo, setGrupo] = useState<string | null>(null)
  const [ocultos, setOcultos] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState('')
  const [destaque, setDestaque] = useState<string | null>(null)

  const faces = useMemo(() => facesDoModelo(modelo), [modelo])
  const grupos = useMemo(() => [...new Set(modelo.faces.map((f) => f.g))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [modelo])
  const { cor, superficieDo } = coresDoCenario(cenario)
  const selecionada = grupo ? superficieDo(grupo) : undefined
  const termo = busca.trim().toLowerCase()
  const lista = materiais.filter((m) => !termo || m.nome.toLowerCase().includes(termo) || nomeCategoria(m.tipo).toLowerCase().includes(termo))

  function atribuir(g: string, material: string) {
    const s = superficieDo(g)
    if (s) mudarMaterial(s.id, material)
  }
  const alternar = (g: string) => setOcultos((o) => { const n = new Set(o); if (n.has(g)) n.delete(g); else n.add(g); return n })

  return (
    <div className="modelo-sup">
      <div className="modelo-sup-visor">
        <Visor3D
          faces={faces}
          cor={cor}
          destaque={destaque}
          selecionado={grupo}
          ocultos={ocultos}
          aoClicar={setGrupo}
          aoSoltar={atribuir}
          rotulo={`Modelo 3D de ${modelo.arquivo}. Clique numa face para escolher a superfície.`}
        />
      </div>
      <div className="modelo-sup-lista" onMouseLeave={() => setDestaque(null)}>
        {grupos.map((g) => {
          const s = superficieDo(g)
          const m = s ? catalogo.get(s.material) : undefined
          return (
            <div key={g} className={`modelo-sup-linha ${grupo === g ? 'selecionada' : ''} ${ocultos.has(g) ? 'oculta' : ''}`} onMouseEnter={() => setDestaque(g)}>
              <button type="button" className="modelo-sup-escolher" onClick={() => setGrupo(grupo === g ? null : g)} aria-pressed={grupo === g}>
                <i className="sw" style={{ background: cor(g) }} />
                <span>
                  <b>{s?.nome ?? g}</b>
                  <small>{s ? `${CATEGORIAS[s.categoria].nome} · ${fmt(areaEfetiva(cenario, s))} m² · ${m!.nome}` : 'Sem superfície ligada (removida na lista)'}</small>
                </span>
              </button>
              <button type="button" className="icone-btn" aria-label={ocultos.has(g) ? `Mostrar ${g}` : `Ocultar ${g}`} title={ocultos.has(g) ? 'Mostrar no modelo' : 'Ocultar no modelo'} onClick={() => alternar(g)}>
                <Icone nome={ocultos.has(g) ? 'olho-fechado' : 'olho'} tamanho={16} />
              </button>
            </div>
          )
        })}
      </div>

      <aside className="modelo-sup-biblioteca">
        {selecionada ? (
          <div className="modelo-sup-selecionada">
            <span className="k">Superfície selecionada</span>
            <b>{selecionada.nome}</b>
            <label className="campo">Tipo
              <select value={selecionada.categoria} onChange={(e) => mudarCategoria(selecionada.id, e.target.value as CategoriaSuperficie)}>
                {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}
              </select>
            </label>
            {erro?.id === selecionada.id && <p className="erro" role="alert">{erro.texto}</p>}
            <span className="modelo-sup-atual">
              <MiniaturaMaterial material={catalogo.get(selecionada.material)} tamanho={36} />
              <span><small>Material atual</small><b>{catalogo.get(selecionada.material).nome}</b></span>
            </span>
          </div>
        ) : (
          <p className="modelo-sup-dica"><Icone nome="ok" tamanho={16} />Clique numa superfície do modelo (ou da lista) e depois num material. Também dá para arrastar o material até a superfície no modelo.</p>
        )}
        <div className="busca">
          <Icone nome="busca" />
          <input type="search" placeholder="Buscar material ou categoria" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="modelo-sup-materiais">
          {lista.slice(0, LIMITE_LISTA).map((m) => (
            <button
              key={m.id}
              type="button"
              draggable
              className={`modelo-sup-material ${selecionada?.material === m.id ? 'atual' : ''}`}
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', m.id); e.dataTransfer.effectAllowed = 'copy' }}
              onClick={() => selecionada && mudarMaterial(selecionada.id, m.id)}
              aria-disabled={!selecionada}
              title={selecionada ? `Aplicar em ${selecionada.nome}` : 'Arraste até uma superfície do modelo'}
            >
              <MiniaturaMaterial material={m} tamanho={36} />
              <span><b>{m.nome}</b><small>{nomeCategoria(m.tipo)} · {resumoAbsorcao(m)}</small></span>
            </button>
          ))}
          {lista.length > LIMITE_LISTA && <p className="nota">Mostrando {LIMITE_LISTA} de {lista.length}. Refine a busca.</p>}
          {!lista.length && <p className="suave">Nenhum material encontrado.</p>}
        </div>
      </aside>
    </div>
  )
}
