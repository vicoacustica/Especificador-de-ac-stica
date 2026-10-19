import { useEffect, useMemo, useState } from 'react'
import { avaliar } from './motor/acustica'
import { Catalogo } from './motor/materiais'
import type { Cenario, EstadoOcupacao, Material, Projeto } from './motor/tipos'
import { cenarioVazio, duplicarCenario, novoId, projetoExemplo } from './dados/exemplo'
import { RepositorioLocal } from './dados/projetos'
import { EtapaAmbiente } from './etapas/Ambiente'
import { EtapaComparar } from './etapas/Comparar'
import { EtapaOcupacao } from './etapas/Ocupacao'
import { EtapaSuperficies } from './etapas/Superficies'
import { PainelResultado } from './resultado/Painel'
import { Texto } from './ui/campos'

const repositorio = new RepositorioLocal()

const ETAPAS = [
  ['Ambiente', 'uso, volume e ar'],
  ['Superfícies', 'áreas e materiais'],
  ['Ocupação', 'público, assentos, nuvens'],
  ['Comparar', 'cenários lado a lado'],
] as const

function projetosIniciais(): Projeto[] {
  const salvos = repositorio.listar()
  if (salvos.length) return salvos
  const exemplo = projetoExemplo()
  repositorio.salvar(exemplo)
  return [exemplo]
}

export default function App() {
  const [projetos, setProjetos] = useState<Projeto[]>(projetosIniciais)
  const [projetoId, setProjetoId] = useState(projetos[0].id)
  const projeto = projetos.find((p) => p.id === projetoId) ?? projetos[0]
  const [cenarioId, setCenarioId] = useState(projeto.cenarios[0].id)
  const cenario = projeto.cenarios.find((c) => c.id === cenarioId) ?? projeto.cenarios[0]
  const [etapa, setEtapa] = useState(1)
  const [estado, setEstado] = useState<EstadoOcupacao>('cheio')
  const [comparar, setComparar] = useState<string[]>(projeto.cenarios.map((c) => c.id))
  const catalogo = useMemo(() => new Catalogo(projeto.materiaisProprios), [projeto.materiaisProprios])

  useEffect(() => { repositorio.salvar(projeto) }, [projeto])

  function mudarProjeto(f: (p: Projeto) => void) {
    setProjetos((lista) => lista.map((p) => {
      if (p.id !== projeto.id) return p
      const copia = structuredClone(p)
      f(copia)
      return copia
    }))
  }
  function mudarCenario(f: (c: Cenario) => void) {
    mudarProjeto((p) => { f(p.cenarios.find((c) => c.id === cenario.id)!) })
  }
  function abrirProjeto(p: Projeto) {
    setProjetoId(p.id)
    setCenarioId(p.cenarios[0].id)
    setComparar(p.cenarios.map((c) => c.id))
  }
  function novoProjeto() {
    const p: Projeto = { id: novoId(), nome: 'Novo projeto', cenarios: [cenarioVazio('Cenário 1')], materiaisProprios: [], atualizadoEm: new Date().toISOString() }
    setProjetos((l) => [p, ...l])
    abrirProjeto(p)
    setEtapa(0)
  }
  function excluirProjeto() {
    repositorio.excluir(projeto.id)
    const resto = projetos.filter((p) => p.id !== projeto.id)
    const lista = resto.length ? resto : [projetoExemplo()]
    setProjetos(lista)
    abrirProjeto(lista[0])
  }
  function duplicar() {
    const n = duplicarCenario(cenario, `${cenario.nome} (cópia)`)
    mudarProjeto((p) => { p.cenarios.push(n) })
    setCenarioId(n.id)
    setComparar((l) => [...l, n.id])
  }
  function novoCenario() {
    const n = cenarioVazio(`Cenário ${projeto.cenarios.length + 1}`)
    mudarProjeto((p) => { p.cenarios.push(n) })
    setCenarioId(n.id)
    setComparar((l) => [...l, n.id])
    setEtapa(0)
  }
  function excluirCenario() {
    const resto = projeto.cenarios.filter((c) => c.id !== cenario.id)
    mudarProjeto((p) => { p.cenarios = resto })
    setCenarioId(resto[0].id)
    setComparar((l) => l.filter((x) => x !== cenario.id))
  }
  function criarMaterial(m: Material) {
    mudarProjeto((p) => { p.materiaisProprios.push(m) })
  }
  const irPara = (i: number) => { setEtapa(i); window.scrollTo({ top: 0 }) }

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Especificador <span>Viço Acústica</span></h1>
          <p>Dimensionamento de materiais acústicos pelo tempo de reverberação (DIN 18041 e NBR 12179), a partir da base de materiais da PLANILHA_TR.</p>
        </div>
      </header>

      <section className="card projeto">
        <div className="proj">
          <label className="f">Meus projetos
            <select value={projeto.id} onChange={(e) => abrirProjeto(projetos.find((p) => p.id === e.target.value)!)}>
              {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          <label className="f grow">Nome do projeto
            <Texto valor={projeto.nome} aoMudar={(v) => mudarProjeto((p) => { p.nome = v || 'Projeto sem nome' })} />
          </label>
          <div className="row">
            <button type="button" className="btn ghost sm" onClick={novoProjeto}>Novo projeto</button>
            <button type="button" className="btn x" onClick={excluirProjeto}>Excluir projeto</button>
          </div>
        </div>
        <p className="note">Os projetos ficam salvos neste navegador. O login da comunidade, com projetos na nuvem, entra numa próxima versão.</p>
        <div className="cens" role="tablist" aria-label="Cenários">
          {projeto.cenarios.map((c) => {
            const ok = avaliar(c, catalogo).aprovado
            return (
              <button key={c.id} type="button" role="tab" className="cen" aria-selected={c.id === cenario.id} onClick={() => setCenarioId(c.id)}>
                <span className={`dot ${ok ? 'ok' : 'bad'}`} />{c.nome}
              </button>
            )
          })}
          <button type="button" className="btn ghost sm" onClick={duplicar}>Duplicar cenário</button>
          <button type="button" className="btn ghost sm" onClick={novoCenario}>Novo cenário</button>
        </div>
        <div className="row cenedit">
          <label className="f">Nome do cenário
            <Texto key={cenario.id} valor={cenario.nome} aoMudar={(v) => mudarCenario((c) => { c.nome = v || 'Cenário' })} />
          </label>
          {projeto.cenarios.length > 1 && <button type="button" className="btn x" onClick={excluirCenario}>Excluir cenário</button>}
        </div>
      </section>

      <div className="grid">
        <main>
          <nav className="steps" role="tablist">
            {ETAPAS.map(([t, s], i) => (
              <button key={t} type="button" role="tab" aria-selected={etapa === i} onClick={() => irPara(i)}>
                <b>{i + 1}. {t}</b><small>{s}</small>
              </button>
            ))}
          </nav>
          <section className="card" key={`${projeto.id}-${cenario.id}-${etapa}`}>
            {etapa === 0 && <EtapaAmbiente cenario={cenario} mudar={mudarCenario} />}
            {etapa === 1 && <EtapaSuperficies cenario={cenario} catalogo={catalogo} mudar={mudarCenario} criarMaterial={criarMaterial} />}
            {etapa === 2 && <EtapaOcupacao cenario={cenario} catalogo={catalogo} mudar={mudarCenario} />}
            {etapa === 3 && <EtapaComparar projeto={projeto} catalogo={catalogo} selecionados={comparar} setSelecionados={setComparar} estado={estado} setEstado={setEstado} />}
            <div className="nav">
              {etapa > 0 ? <button type="button" className="btn ghost" onClick={() => irPara(etapa - 1)}>Voltar</button> : <span />}
              {etapa < 3 && <button type="button" className="btn" onClick={() => irPara(etapa + 1)}>Avançar</button>}
            </div>
          </section>
        </main>
        <aside className="res">
          <PainelResultado projeto={projeto} cenario={cenario} catalogo={catalogo} estado={estado} setEstado={setEstado} />
        </aside>
      </div>
    </div>
  )
}
