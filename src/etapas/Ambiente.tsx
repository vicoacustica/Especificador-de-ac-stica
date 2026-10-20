import { CURVAS_NBR, DIN, GRUPOS_A, NBR, GRUPOS_B, metaDoCriterio } from '../motor/criterios'
import type { Cenario, Criterio, Umidade } from '../motor/tipos'
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

export function EtapaAmbiente({ cenario, mudar }: { cenario: Cenario; mudar: (f: (c: Cenario) => void) => void }) {
  const meta = metaDoCriterio(cenario.criterio, cenario.volume, cenario.peDireito)
  return (
    <>
      <h2>Ambiente</h2>
      <p className="lead">Escolha a classificação do ambiente pela norma, informe o volume e a umidade relativa do ar.</p>
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <h3>{g.titulo}</h3>
          <div className="usos">
            {g.opcoes.map((o) => (
              <button key={o.titulo} type="button" className="uso" aria-pressed={igual(o.criterio, cenario.criterio)} onClick={() => mudar((c) => { c.criterio = o.criterio })}>
                <b>{o.titulo}</b>
                <small>{o.exemplos}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
      <h3>Volume e ar</h3>
      <div className="linha">
        <label className="campo">Volume (V) em m³
          <Numero valor={cenario.volume} minimo={1} passo={1} aoMudar={(v) => mudar((c) => { c.volume = v })} />
        </label>
        {meta.tipo === 'absorcao' && (
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
        <span className="k">Critério deste cenário</span>
        <b>{meta.nome}</b>
        {meta.tipo === 'tempo' && !meta.otimo && (
          <span>Tempo de reverberação alvo (T<sub>alvo</sub>) = <b>{fmt(meta.t)} s</b>. Faixa aceita: 65% a 145% em 125 Hz, 80% a 120% de 250 a 2000 Hz e 65% a 120% em 4000 Hz.</span>
        )}
        {meta.tipo === 'tempo' && meta.otimo && (
          <span>Tempo de reverberação ótimo (T<sub>ót</sub>) = <b>{fmt(meta.t)} s</b>, lido no ábaco da {NBR} a 500 Hz e aplicado a todas as bandas, com as margens da {DIN}.</span>
        )}
        {meta.tipo === 'absorcao' && (
          <span>Relação mínima entre área de absorção equivalente e volume (A/V) = <b>{fmt(meta.avMinimo, 3)} m²/m³</b> para o pé-direito (h) informado, com 100% de ocupação, de 250 a 2000 Hz.</span>
        )}
        {meta.tipo === 'tempo' && meta.foraDaFaixa && <span className="pill warn">O volume está fora da faixa da norma para este uso ({meta.faixaVolume})</span>}
        {meta.tipo === 'absorcao' && <span className="nota">No grupo B a DIN usa o pé-direito (h) para definir o A/V mínimo, por isso ele é pedido aqui.</span>}
      </div>
    </>
  )
}
