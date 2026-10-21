import { useState } from 'react'
import { avaliarCriterios, motivoDaFormula, type Avaliacao } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import { BANDAS, NOME_ESTADO, NOME_FORMULA, type Cenario, type EstadoOcupacao, type Projeto } from '../motor/tipos'
import { Segmentado } from '../ui/campos'
import { fmt } from '../ui/formato'
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

/** Resultado de um critério: A/V no grupo B, tempo de reverberação por banda nos demais. */
function CorpoAvaliacao({ av, cenario, estado, setEstado, completo }: { av: Avaliacao; cenario: Cenario; estado: EstadoOcupacao; setEstado: (e: EstadoOcupacao) => void; completo: boolean }) {
  const r = av.resultado
  if (av.tipo === 'absorcao') {
    return (
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
  }
  const est = r.estados.includes(estado) ? estado : r.estados[r.estados.length - 1]
  return (
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
      {completo && (
        <>
          <p className={`obs ${r.formula}`}><b>Observação:</b> {motivoDaFormula(r)}</p>
          <div className="legenda-eq">
            {r.formula === 'sabine' ? 'T = 0,161·V / (A + 4mV)' : r.formula === 'eyring' ? 'T = 0,161·V / (4mV − S·ln(1 − ᾱ))' : 'T = Σ (Sk/S) · 0,161·V / (4mV − S·ln(1 − ᾱk)), k = x, y, z'}<br />
            Tempo de reverberação (T) em s; Volume (V) em m³; Área de absorção equivalente (A) em m²; Coeficiente de atenuação do ar (m) em m⁻¹
            {r.formula !== 'sabine' && '; Área total das superfícies (S) em m²; Coeficiente de absorção médio (ᾱ) = A/S'}
            {r.formula === 'fitzroy' && '; Área (Sk) e Coeficiente de absorção médio (ᾱk) de cada par de superfícies opostas: paredes ao longo do comprimento (x), da largura (y) e piso e teto (z)'}.
          </div>
        </>
      )}
    </>
  )
}

export function PainelResultado({ projeto, cenario, catalogo, estado, setEstado, perfil, mudarPerfil }: Props) {
  const [gerando, setGerando] = useState(false)
  const [principal, ...extras] = avaliarCriterios(cenario, catalogo)
  const r = principal.resultado

  return (
    <>
      <section className="cartao">
        <div className="status">
          <span className="big">{cenario.nome}</span>
          {principal.tipo === 'tempo' && <span className={`pill ${r.formula === 'sabine' ? 'ok' : 'warn'}`}>{NOME_FORMULA[r.formula]}</span>}
        </div>
        <div className="nota">{principal.meta.nome}</div>
        <CorpoAvaliacao av={principal} cenario={cenario} estado={estado} setEstado={setEstado} completo />
      </section>
      {extras.map((av) => (
        <section key={av.meta.nome} className="cartao">
          <span className="k-extra">Critério complementar</span>
          <div className="nota">{av.meta.nome}</div>
          <CorpoAvaliacao av={av} cenario={cenario} estado={estado} setEstado={setEstado} completo={false} />
        </section>
      ))}
      <section className="cartao memorial-cartao">
        <b>Memorial de especificação</b>
        <p className="nota">PDF com plantas e vistas do modelo 3D, quadro de especificações dos materiais acústicos, resultados e memória de cálculo.</p>
        <button type="button" className="btn primario" onClick={() => setGerando(true)}><Icone nome="documento" />Gerar memorial</button>
      </section>
      {gerando && <GerarMemorial projeto={projeto} cenarioId={cenario.id} catalogo={catalogo} perfil={perfil} mudarPerfil={mudarPerfil} aoFechar={() => setGerando(false)} />}
    </>
  )
}
