import { useState } from 'react'
import { avaliar, NOME_SITUACAO } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import { BANDAS, NOME_ESTADO, type Cenario, type EstadoOcupacao, type Projeto } from '../motor/tipos'
import { Segmentado } from '../ui/campos'
import { CLASSE_SITUACAO, fmt } from '../ui/formato'
import { GraficoAV, GraficoTempo } from './Graficos'
import { GerarMemorial } from './GerarMemorial'
import type { Perfil } from '../dados/conta'
import { Icone } from '../ui/Icone'

const CLASSE = { ok: 'o', acima: 'a', abaixo: 'b', invalido: 'b' } as const

interface Props {
  projeto: Projeto
  cenario: Cenario
  catalogo: Catalogo
  estado: EstadoOcupacao
  setEstado: (e: EstadoOcupacao) => void
  perfil: Perfil
  mudarPerfil: (p: Perfil) => void
}

export function PainelResultado({ projeto, cenario, catalogo, estado, setEstado, perfil, mudarPerfil }: Props) {
  const [gerando, setGerando] = useState(false)
  const av = avaliar(cenario, catalogo)
  const r = av.resultado

  let falhas: string[] = []
  let corpo
  if (av.tipo === 'absorcao') {
    corpo = (
      <>
        <div className="kv">
          <div><small>Volume (V)</small><b>{fmt(cenario.volume, 0)} m³</b></div>
          <div><small>Pé-direito (h)</small><b>{fmt(cenario.peDireito, 2)} m</b></div>
          <div><small>A/V mínimo</small><b>{fmt(av.meta.avMinimo, 3)}</b></div>
        </div>
        <h3>Área de absorção por volume (A/V), 100% de ocupação</h3>
        <GraficoAV av={av.av} minimo={av.meta.avMinimo} />
        <p className="nota">Contam as bandas de 250 a 2000 Hz.</p>
      </>
    )
  } else {
    const est = r.estados.includes(estado) ? estado : r.estados[r.estados.length - 1]
    falhas = r.estados.flatMap((e) => {
      const acima = av.bandas[e].includes('acima'), abaixo = av.bandas[e].some((b) => b === 'abaixo' || b === 'invalido')
      return acima || abaixo ? [`${NOME_ESTADO[e]}: ${[acima && 'reverberante demais', abaixo && 'seca demais'].filter(Boolean).join(' e ')}`] : []
    })
    corpo = (
      <>
        <div className="kv">
          <div><small>Volume (V)</small><b>{fmt(cenario.volume, 0)} m³</b></div>
          <div><small>{av.meta.otimo ? 'T ótimo' : 'T alvo'}</small><b>{fmt(av.meta.t)} s</b></div>
          <div><small>ᾱ médio da sala</small><b>{fmt(r.alfaMedioSala)}</b></div>
        </div>
        <div className="legend" style={{ marginTop: 12 }}>
          {r.estados.map((e) => <span key={e}><i style={{ background: `var(--s-${e})` }} />{NOME_ESTADO[e]}</span>)}
          <span><i style={{ background: 'var(--band)', height: 8 }} />faixa aceita</span>
        </div>
        <GraficoTempo
          rotulo="Tempo de reverberação por banda"
          faixa={{ superior: av.meta.superior, inferior: av.meta.inferior, alvo: av.meta.t }}
          series={r.estados.map((e) => ({ cor: `var(--s-${e})`, valores: r.tempo[e] }))}
        />
        <div className="linha" style={{ justifyContent: 'space-between' }}>
          <span className="nota">Tempo de reverberação (T) em s</span>
          <Segmentado rotulo="Ocupação na tabela" valor={est} aoMudar={setEstado} opcoes={r.estados.map((e) => ({ valor: e, rotulo: NOME_ESTADO[e] }))} />
        </div>
        <div className="tbl">
          <table className="bandas">
            <thead><tr><th>Hz</th>{BANDAS.map((b) => <th key={b} className="num">{b}</th>)}</tr></thead>
            <tbody>
              <tr><td>T (s)</td>{r.tempo[est].map((v, i) => <td key={i} className={`num ${CLASSE[av.bandas[est][i]]}`}>{fmt(v)}</td>)}</tr>
              <tr><td className="suave">mín.</td>{av.meta.inferior.map((v, i) => <td key={i} className="num suave">{fmt(v)}</td>)}</tr>
              <tr><td className="suave">máx.</td>{av.meta.superior.map((v, i) => <td key={i} className="num suave">{fmt(v)}</td>)}</tr>
            </tbody>
          </table>
        </div>
        <p className={`obs ${r.formula}`}>
          <b>Observação:</b> o coeficiente de absorção médio da sala (ᾱ) é {fmt(r.alfaMedioSala)}, calculado pela média das seis bandas com {NOME_ESTADO[r.estadoAlfaMedio]} de ocupação.{' '}
          {r.formula === 'eyring' ? 'Como passa de 0,30, os resultados usam a fórmula de Eyring, mais precisa em salas absorventes.' : 'Como não passa de 0,30, os resultados usam a fórmula de Sabine.'}
        </p>
        <div className="legenda-eq">
          {r.formula === 'sabine' ? 'T = 0,161·V / (A + 4mV)' : 'T = 0,161·V / (4mV − S·ln(1 − ᾱ))'}<br />
          Tempo de reverberação (T) em s; Volume (V) em m³; Área de absorção equivalente (A) em m²; Coeficiente de atenuação do ar (m) em m⁻¹
          {r.formula === 'eyring' && '; Área total das superfícies (S) em m²; Coeficiente de absorção médio (ᾱ) = A/S'}.
        </div>
      </>
    )
  }

  return (
    <>
      <section className="cartao">
        <div className="status">
          <span className={`big ${CLASSE_SITUACAO[av.situacao]}`}>{NOME_SITUACAO[av.situacao]}</span>
          {av.tipo === 'tempo' && <span className={`pill ${r.formula === 'eyring' ? 'warn' : 'ok'}`}>{r.formula === 'eyring' ? 'Eyring' : 'Sabine'}</span>}
        </div>
        <div className="nota">{cenario.nome} · {av.meta.nome}</div>
        {falhas.length > 0 && <p className="nota">{falhas.join(' · ')}</p>}
        {corpo}
      </section>
      <section className="cartao memorial-cartao">
        <b>Memorial de especificação</b>
        <p className="nota">PDF com plantas e vistas do modelo 3D, quadro de especificações dos materiais acústicos, resultados e memória de cálculo.</p>
        <button type="button" className="btn primario" onClick={() => setGerando(true)}><Icone nome="documento" />Gerar memorial</button>
      </section>
      {gerando && <GerarMemorial projeto={projeto} cenarioId={cenario.id} catalogo={catalogo} perfil={perfil} mudarPerfil={mudarPerfil} aoFechar={() => setGerando(false)} />}
    </>
  )
}
