import { useState } from 'react'
import { avaliar } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import type { Cenario, EstadoOcupacao, Projeto } from '../motor/tipos'
import { cenarioVazio, duplicarCenario } from '../dados/exemplo'
import { EtapaAmbiente } from '../etapas/Ambiente'
import { EtapaComparar } from '../etapas/Comparar'
import { EtapaOcupacao } from '../etapas/Ocupacao'
import { EtapaSuperficies } from '../etapas/Superficies'
import { PainelResultado } from '../resultado/Painel'
import { Texto } from '../ui/campos'
import type { SalvarMaterial } from '../ui/EditorMaterial'
import { Icone, type NomeIcone } from '../ui/Icone'

const ETAPAS: { titulo: string; icone: NomeIcone }[] = [
  { titulo: 'Ambiente', icone: 'ambiente' },
  { titulo: 'Superfícies', icone: 'superficies' },
  { titulo: 'Ocupação', icone: 'ocupacao' },
  { titulo: 'Comparar', icone: 'comparar' },
]

interface Props {
  projeto: Projeto
  catalogo: Catalogo
  mudarProjeto: (f: (p: Projeto) => void) => void
  salvarMaterial: (s: SalvarMaterial) => void
  voltar: () => void
  abrirAjuda: () => void
}

export function Editor({ projeto, catalogo, mudarProjeto, salvarMaterial, voltar, abrirAjuda }: Props) {
  const [cenarioId, setCenarioId] = useState(projeto.cenarios[0].id)
  const cenario = projeto.cenarios.find((c) => c.id === cenarioId) ?? projeto.cenarios[0]
  const [etapa, setEtapa] = useState(cenario.superficies.length ? 1 : 0)
  const [estado, setEstado] = useState<EstadoOcupacao>('cheio')
  const [comparar, setComparar] = useState<string[]>(projeto.cenarios.map((c) => c.id))
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  function mudarCenario(f: (c: Cenario) => void) {
    mudarProjeto((p) => { f(p.cenarios.find((c) => c.id === cenario.id)!) })
  }
  function adicionar(n: Cenario) {
    mudarProjeto((p) => { p.cenarios.push(n) })
    setCenarioId(n.id)
    setComparar((l) => [...l, n.id])
  }
  function excluirCenario() {
    const resto = projeto.cenarios.filter((c) => c.id !== cenario.id)
    mudarProjeto((p) => { p.cenarios = resto })
    setCenarioId(resto[0].id)
    setComparar((l) => l.filter((x) => x !== cenario.id))
    setConfirmarExclusao(false)
  }
  const irPara = (i: number) => { setEtapa(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="pagina">
      <button type="button" className="link-voltar" onClick={voltar}><Icone nome="voltar" tamanho={16} />Projetos</button>
      <header className="cabecalho">
        <div className="cabecalho-texto">
          <Texto className="titulo-editavel" rotulo="Nome do projeto" valor={projeto.nome} aoMudar={(v) => mudarProjeto((p) => { p.nome = v || 'Projeto sem nome' })} />
          <p>{projeto.cenarios.length} {projeto.cenarios.length === 1 ? 'cenário' : 'cenários'} · cada cenário é uma alternativa de projeto para a mesma sala.</p>
        </div>
        <div className="cabecalho-acoes">
          <button type="button" className="btn secundario" onClick={abrirAjuda}><Icone nome="ajuda" />Guia</button>
          <button type="button" className="btn secundario" onClick={() => adicionar(duplicarCenario(cenario, `${cenario.nome} (cópia)`))}><Icone nome="copiar" />Duplicar cenário</button>
          <button type="button" className="btn primario" onClick={() => { adicionar(cenarioVazio(`Cenário ${projeto.cenarios.length + 1}`)); setEtapa(0) }}><Icone nome="mais" />Novo cenário</button>
        </div>
      </header>

      <div className="cenarios" role="tablist" aria-label="Cenários">
        {projeto.cenarios.map((c) => {
          const ok = avaliar(c, catalogo).aprovado
          return (
            <button key={c.id} type="button" role="tab" className="pilula" aria-selected={c.id === cenario.id} onClick={() => setCenarioId(c.id)}>
              <span className={`ponto ${ok ? 'ok' : 'ruim'}`} aria-label={ok ? 'atende' : 'não atende'} />{c.nome}
            </button>
          )
        })}
      </div>
      <div className="linha cenario-nome">
        <label className="campo">Nome do cenário
          <Texto key={cenario.id} valor={cenario.nome} aoMudar={(v) => mudarCenario((c) => { c.nome = v || 'Cenário' })} />
        </label>
        {projeto.cenarios.length > 1 && !confirmarExclusao && <button type="button" className="btn fantasma" onClick={() => setConfirmarExclusao(true)}><Icone nome="lixo" />Excluir cenário</button>}
        {confirmarExclusao && (
          <span className="confirmar">Excluir “{cenario.nome}”?
            <button type="button" className="btn perigo pequeno" onClick={excluirCenario}>Excluir</button>
            <button type="button" className="btn fantasma pequeno" onClick={() => setConfirmarExclusao(false)}>Cancelar</button>
          </span>
        )}
      </div>

      <div className="editor">
        <main className="editor-principal">
          <nav className="etapas" role="tablist" aria-label="Etapas">
            {ETAPAS.map((e, i) => (
              <button key={e.titulo} type="button" role="tab" className="pilula etapa" aria-selected={etapa === i} onClick={() => irPara(i)}>
                <span className="pilula-icone"><Icone nome={e.icone} /></span>
                <span><small>Etapa {i + 1}</small>{e.titulo}</span>
              </button>
            ))}
          </nav>
          <section className="painel" key={`${cenario.id}-${etapa}`}>
            {etapa === 0 && <EtapaAmbiente cenario={cenario} mudar={mudarCenario} />}
            {etapa === 1 && <EtapaSuperficies cenario={cenario} catalogo={catalogo} mudar={mudarCenario} salvarMaterial={salvarMaterial} />}
            {etapa === 2 && <EtapaOcupacao cenario={cenario} catalogo={catalogo} mudar={mudarCenario} />}
            {etapa === 3 && <EtapaComparar projeto={projeto} catalogo={catalogo} selecionados={comparar} setSelecionados={setComparar} estado={estado} setEstado={setEstado} />}
            <div className="navegacao">
              {etapa > 0 ? <button type="button" className="btn secundario" onClick={() => irPara(etapa - 1)}><Icone nome="voltar" />Voltar</button> : <span />}
              {etapa < 3 && <button type="button" className="btn primario" onClick={() => irPara(etapa + 1)}>Avançar para {ETAPAS[etapa + 1].titulo.toLowerCase()}</button>}
            </div>
          </section>
        </main>
        <aside className="editor-resultado">
          <PainelResultado projeto={projeto} cenario={cenario} catalogo={catalogo} estado={estado} setEstado={setEstado} />
        </aside>
      </div>
    </div>
  )
}
