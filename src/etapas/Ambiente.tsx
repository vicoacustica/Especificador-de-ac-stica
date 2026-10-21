import { CURVAS_NBR, DIN, GRUPOS_A, MARGENS_DIN_PCT, NBR, GRUPOS_B, metaDoCriterio } from '../motor/criterios'
import { useState } from 'react'
import type { Catalogo } from '../motor/materiais'
import { BANDAS, type Cenario, type Criterio, type EscolhaFormula, type ModeloProjeto, type PorBanda, type Umidade } from '../motor/tipos'
import { RAZAO_FITZROY } from '../motor/acustica'
import { ImportarModelo, type ResultadoImportacao } from '../importacao/ImportarModelo'
import { Icone } from '../ui/Icone'
import { Numero } from '../ui/campos'
import { fmt } from '../ui/formato'

interface Opcao { criterio: Criterio; titulo: string; exemplos: string }

const GRUPOS: { titulo: string; opcoes: Opcao[] }[] = [
  {
    titulo: `${DIN}, grupo A: o alvo é um tempo de reverberação`,
    opcoes: Object.entries(GRUPOS_A).map(([g, d]) => ({ criterio: { norma: 'A', grupo: g as keyof typeof GRUPOS_A }, titulo: `${g} · ${d.uso}`, exemplos: d.exemplos })),
  },
  {
    titulo: `${DIN}, grupo B: o alvo é uma absorção mínima (A/V)`,
    opcoes: Object.entries(GRUPOS_B).map(([g, d]) => ({ criterio: { norma: 'B', grupo: g as keyof typeof GRUPOS_B }, titulo: `${g} · ${d.uso}`, exemplos: d.exemplos })),
  },
  {
    titulo: `${NBR}: salas de performance, com margens da ${DIN}`,
    opcoes: Object.entries(CURVAS_NBR).map(([c, d]) => ({ criterio: { norma: 'NBR', curva: c as keyof typeof CURVAS_NBR }, titulo: `NBR · ${d.usos}`, exemplos: d.exemplos })),
  },
]

const igual = (a: Criterio, b: Criterio) => JSON.stringify(a) === JSON.stringify(b)

const FORMULAS: { valor: EscolhaFormula; titulo: string; texto: string }[] = [
  { valor: 'auto', titulo: 'Automática', texto: `Fitzroy quando a absorção está concentrada em um par de superfícies (ᾱ ${RAZAO_FITZROY} vezes maior que o de outro par); senão Eyring acima de ᾱ = 0,30 e Sabine até 0,30.` },
  { valor: 'sabine', titulo: 'Sabine', texto: 'Salas pouco absorventes, com absorção bem distribuída.' },
  { valor: 'eyring', titulo: 'Eyring', texto: 'Salas absorventes (ᾱ acima de 0,30), com absorção bem distribuída.' },
  { valor: 'fitzroy', titulo: 'Fitzroy', texto: 'Absorção concentrada em um par de superfícies, como um forro acústico em sala de paredes lisas. Pede o par de cada parede na etapa Superfícies.' },
]

/** Tempo ótimo e margens por banda definidos pelo projetista. */
function CriterioPersonalizado({ criterio, mudar }: { criterio: Extract<Criterio, { norma: 'personalizado' }>; mudar: (f: (c: Extract<Criterio, { norma: 'personalizado' }>) => void) => void }) {
  const t = criterio.t
  const margem = (lado: 'superior' | 'inferior', i: number, v: number) => mudar((c) => { c[lado] = c[lado].map((x, k) => (k === i ? Math.max(0, Math.min(lado === 'inferior' ? 100 : 500, v)) : x)) as PorBanda })
  return (
    <div className="personalizado">
      <label className="campo"><span>Tempo de reverberação ótimo (T<sub>ót</sub>) em s</span>
        <Numero valor={t} minimo={0.05} passo={0.05} aoMudar={(v) => mudar((c) => { c.t = Math.max(0.05, v) })} />
      </label>
      <div className="tabela-rolagem">
        <table className="margens">
          <thead><tr><th>Banda</th>{BANDAS.map((b) => <th key={b} className="num">{b} Hz</th>)}</tr></thead>
          <tbody>
            <tr><td>Limite superior (+%)</td>{BANDAS.map((b, i) => <td key={b}><Numero rotulo={`Limite superior em ${b} Hz, em %`} valor={criterio.superior[i]} minimo={0} passo={5} aoMudar={(v) => margem('superior', i, v)} /></td>)}</tr>
            <tr><td>Limite inferior (−%)</td>{BANDAS.map((b, i) => <td key={b}><Numero rotulo={`Limite inferior em ${b} Hz, em %`} valor={criterio.inferior[i]} minimo={0} passo={5} aoMudar={(v) => margem('inferior', i, v)} /></td>)}</tr>
            <tr className="suave"><td>Máximo (s)</td>{criterio.superior.map((p, i) => <td key={i} className="num">{fmt(t * (1 + p / 100))}</td>)}</tr>
            <tr className="suave"><td>Mínimo (s)</td>{criterio.inferior.map((p, i) => <td key={i} className="num">{fmt(Math.max(0, t * (1 - p / 100)))}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <button type="button" className="btn fantasma pequeno" onClick={() => mudar((c) => { c.superior = [...MARGENS_DIN_PCT.superior]; c.inferior = [...MARGENS_DIN_PCT.inferior] })}>Usar as margens da {DIN}</button>
    </div>
  )
}

interface Props {
  cenario: Cenario
  catalogo: Catalogo
  mudar: (f: (c: Cenario) => void) => void
  irParaSuperficies: () => void
  definirModelo: (m: ModeloProjeto) => void
}

export function EtapaAmbiente({ cenario, catalogo, mudar, irParaSuperficies, definirModelo }: Props) {
  const meta = metaDoCriterio(cenario.criterio, cenario.volume, cenario.peDireito)
  const extras = cenario.criteriosExtras ?? []
  const metasExtras = extras.map((k) => metaDoCriterio(k, cenario.volume, cenario.peDireito))
  const usaGrupoB = [cenario.criterio, ...extras].some((k) => k.norma === 'B')
  const alternarExtra = (k: Criterio) => mudar((c) => {
    const atuais = c.criteriosExtras ?? []
    c.criteriosExtras = atuais.some((x) => igual(x, k)) ? atuais.filter((x) => !igual(x, k)) : [...atuais, k]
  })
  const [importando, setImportando] = useState(false)
  const [importado, setImportado] = useState<ResultadoImportacao | null>(null)

  function aplicar(r: ResultadoImportacao) {
    mudar((c) => {
      c.superficies = r.superficies
      c.grupos = { ...(c.grupos ?? {}), ...r.grupos }
      if (r.volume) c.volume = r.volume
      if (r.peDireito) c.peDireito = r.peDireito
    })
    definirModelo(r.modelo)
    setImportado(r)
    setImportando(false)
  }

  return (
    <>
      <h2>Ambiente</h2>
      <p className="lead">Escolha o critério principal pela norma ou defina um critério personalizado. Se quiser, marque critérios complementares para avaliar o mesmo ambiente por outras normas. Depois informe o volume e a umidade relativa do ar.</p>
      <div className="importar-chamada">
        <span className="importar-chamada-icone"><Icone nome="enviar" tamanho={20} /></span>
        <span>
          <b>Tem o modelo 3D do ambiente?</b>
          <span className="suave">Importe um DXF ou OBJ: o sistema mostra a prévia e as áreas de cada layer, cria as superfícies e pode trazer o volume e o pé-direito.</span>
        </span>
        <button type="button" className="btn secundario" onClick={() => setImportando(true)}>Importar modelo</button>
      </div>
      {importado && (
        <p className="importado">
          <Icone nome="ok" tamanho={16} />
          <span>“{importado.arquivo}” importado: {importado.superficies.length} superfícies{importado.volume ? `, volume ${fmt(importado.volume, 1)} m³` : ''}{importado.peDireito ? `, pé-direito ${fmt(importado.peDireito)} m` : ''}. Na próxima etapa, clique nas superfícies do modelo para ajustar o tipo e o material.</span>
          <button type="button" className="btn fantasma pequeno" onClick={irParaSuperficies}>Revisar superfícies<Icone nome="seta" tamanho={14} /></button>
        </p>
      )}
      {importando && <ImportarModelo cenario={cenario} catalogo={catalogo} aoImportar={aplicar} aoFechar={() => setImportando(false)} />}
      <h3 className="titulo-secao-criterio">Critério principal</h3>
      <p className="nota">É o critério usado no dimensionamento dos materiais, no cartão do projeto e no início do memorial.</p>
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <h3>{g.titulo}</h3>
          <div className="usos">
            {g.opcoes.map((o) => (
              <button key={o.titulo} type="button" className="uso" aria-pressed={igual(o.criterio, cenario.criterio)} onClick={() => mudar((c) => { c.criterio = o.criterio; c.criteriosExtras = (c.criteriosExtras ?? []).filter((x) => !igual(x, o.criterio)) })}>
                <b>{o.titulo}</b>
                <small>{o.exemplos}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <h3>Critério personalizado: tempo ótimo e margens definidos por você</h3>
        <div className="usos">
          <button type="button" className="uso" aria-pressed={cenario.criterio.norma === 'personalizado'} onClick={() => {
            if (cenario.criterio.norma === 'personalizado') return
            mudar((c) => { c.criterio = { norma: 'personalizado', t: +(meta.tipo === 'tempo' ? meta.t : 1).toFixed(2), superior: [...MARGENS_DIN_PCT.superior], inferior: [...MARGENS_DIN_PCT.inferior] } })
          }}>
            <b>Personalizado</b>
            <small>Informe o tempo ótimo de reverberação e as margens superior e inferior de cada banda, em %.</small>
          </button>
        </div>
        {cenario.criterio.norma === 'personalizado' && (
          <CriterioPersonalizado criterio={cenario.criterio} mudar={(f) => mudar((c) => { if (c.criterio.norma === 'personalizado') f(c.criterio) })} />
        )}
      </div>
      <div className="ambiente-avancado">
      <div className="criterios-complementares">
        <h3>Critérios complementares</h3>
        <p className="nota">Marque quantos quiser. Os resultados mostram o ambiente avaliado por cada um, lado a lado. Exemplo: um restaurante pelo grupo B5 da {DIN} e pela curva de sala de conferência da {NBR}.</p>
        {GRUPOS.map((g) => (
          <div key={g.titulo} className="extras-grupo">
            <span className="k">{g.titulo.split(':')[0]}</span>
            <div className="chips">
              {g.opcoes.filter((o) => !igual(o.criterio, cenario.criterio)).map((o) => (
                <button key={o.titulo} type="button" className="chip" aria-pressed={extras.some((x) => igual(x, o.criterio))} onClick={() => alternarExtra(o.criterio)}>{o.titulo}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <h3>Fórmula do tempo de reverberação</h3>
      <div className="usos formulas">
        {FORMULAS.map((f) => (
          <button key={f.valor} type="button" className="uso" aria-pressed={(cenario.formula ?? 'auto') === f.valor} onClick={() => mudar((c) => { c.formula = f.valor })}>
            <b>{f.titulo}</b>
            <small>{f.texto}</small>
          </button>
        ))}
      </div>
      </div>
      <h3>Volume e ar</h3>
      <div className="linha">
        <label className="campo">Volume (V) em m³
          <Numero valor={cenario.volume} minimo={1} passo={1} aoMudar={(v) => mudar((c) => { c.volume = v })} />
        </label>
        {usaGrupoB && (
          <label className="campo">Pé-direito (h) em m
            <Numero valor={cenario.peDireito} minimo={1} passo={0.1} aoMudar={(v) => mudar((c) => { c.peDireito = v })} />
          </label>
        )}
        <label className="campo">Umidade relativa do ar (UR)
          <select value={cenario.umidade} onChange={(e) => mudar((c) => { c.umidade = Number(e.target.value) as Umidade })}>
            <option value={0}>Desconsiderar absorção do ar</option>
            {[40, 50, 60].map((u) => <option key={u} value={u}>{u}%</option>)}
          </select>
        </label>
      </div>
      <div className="criterio">
        <span className="k">Critério principal deste cenário</span>
        <b>{meta.nome}</b>
        {meta.tipo === 'tempo' && !meta.otimo && (
          <span>Tempo de reverberação alvo (T<sub>alvo</sub>) = <b>{fmt(meta.t)} s</b>. Faixa aceita: 65% a 145% em 125 Hz, 80% a 120% de 250 a 2000 Hz e 65% a 120% em 4000 Hz.</span>
        )}
        {cenario.criterio.norma === 'personalizado' && meta.tipo === 'tempo' && (
          <span>Tempo de reverberação ótimo (T<sub>ót</sub>) = <b>{fmt(meta.t)} s</b>, definido pelo projetista e aplicado a todas as bandas, com as margens informadas acima.</span>
        )}
        {meta.tipo === 'tempo' && meta.otimo && cenario.criterio.norma === 'NBR' && (
          <span>Tempo de reverberação ótimo (T<sub>ót</sub>) = <b>{fmt(meta.t)} s</b>, lido no ábaco da {NBR} a 500 Hz e aplicado a todas as bandas, com as margens da {DIN}.</span>
        )}
        {meta.tipo === 'absorcao' && (
          <span>Relação mínima entre área de absorção equivalente e volume (A/V) = <b>{fmt(meta.avMinimo, 3)} m²/m³</b> para o pé-direito (h) informado, com 100% de ocupação, de 250 a 2000 Hz.</span>
        )}
        {meta.tipo === 'tempo' && meta.foraDaFaixa && <span className="pill warn">O volume está fora da faixa da norma para este uso ({meta.faixaVolume})</span>}
        {metasExtras.length > 0 && (
          <span className="criterios-extras">
            <span className="k">Critérios complementares</span>
            {metasExtras.map((m) => (
              <span key={m.nome}>{m.nome}: {m.tipo === 'tempo' ? <b>{fmt(m.t)} s</b> : <b>A/V ≥ {fmt(m.avMinimo, 3)} m²/m³</b>}{m.tipo === 'tempo' && m.foraDaFaixa ? ` (volume fora da faixa da norma, ${m.faixaVolume})` : ''}</span>
            ))}
          </span>
        )}
        {usaGrupoB && <span className="nota">No grupo B a DIN usa o pé-direito (h) para definir o A/V mínimo, por isso ele é pedido aqui.</span>}
      </div>
    </>
  )
}
