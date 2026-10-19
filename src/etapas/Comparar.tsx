import { avaliar } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import { BANDAS, ESTADOS, NOME_ESTADO, type EstadoOcupacao, type Projeto } from '../motor/tipos'
import { GraficoTempo } from '../resultado/Graficos'
import { Segmentado } from '../ui/campos'
import { fmt } from '../ui/formato'

const CORES = ['var(--c0)', 'var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)']
const CLASSE = { ok: 'o', acima: 'a', abaixo: 'b', invalido: 'b' } as const

interface Props {
  projeto: Projeto
  catalogo: Catalogo
  selecionados: string[]
  setSelecionados: (ids: string[]) => void
  estado: EstadoOcupacao
  setEstado: (e: EstadoOcupacao) => void
}

export function EtapaComparar({ projeto, catalogo, selecionados, setSelecionados, estado, setEstado }: Props) {
  const linhas = projeto.cenarios
    .filter((c) => selecionados.includes(c.id))
    .map((c, k) => ({ c, av: avaliar(c, catalogo), cor: CORES[k % CORES.length] }))
  const comTempo = linhas.filter((l) => l.av.tipo === 'tempo')
  const alvos = new Set(comTempo.map((l) => (l.av.tipo === 'tempo' ? l.av.meta.t.toFixed(3) : '')))
  const alvoUnico = alvos.size === 1 && comTempo[0]?.av.tipo === 'tempo' ? comTempo[0].av.meta : null

  return (
    <>
      <h2>Comparar cenários</h2>
      <p className="lead">Marque os cenários que quer comparar. Para criar um cenário, duplique o atual no topo e altere o que quiser.</p>
      <div className="chips">
        {projeto.cenarios.map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={selecionados.includes(c.id)}
            onClick={() => setSelecionados(selecionados.includes(c.id) ? selecionados.filter((x) => x !== c.id) : [...selecionados, c.id])}>{c.nome}</button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 14 }}>
        <h3 style={{ margin: 0 }}>Tempo de reverberação (T) com {NOME_ESTADO[estado]} de ocupação</h3>
        <Segmentado rotulo="Ocupação" valor={estado} aoMudar={setEstado} opcoes={ESTADOS.map((e) => ({ valor: e, rotulo: NOME_ESTADO[e] }))} />
      </div>
      {!linhas.length && <p className="muted">Selecione ao menos um cenário.</p>}
      {comTempo.length > 0 && (
        <div className="tbl">
          <div style={{ minWidth: 420 }}>
            <GraficoTempo
              rotulo="Comparação de cenários"
              largura={640}
              faixa={alvoUnico ? { superior: alvoUnico.superior, inferior: alvoUnico.inferior, alvo: alvoUnico.t } : undefined}
              series={comTempo.map(({ av, cor }) => ({
                cor,
                valores: av.resultado.tempo[estado],
                margens: !alvoUnico && av.tipo === 'tempo' ? { superior: av.meta.superior, inferior: av.meta.inferior } : undefined,
              }))}
            />
          </div>
        </div>
      )}
      {comTempo.length > 0 && (
        <p className="note">{alvoUnico
          ? 'A faixa verde vai da margem inferior à superior do tempo de reverberação ótimo.'
          : 'Os cenários têm alvos diferentes. As linhas tracejadas mostram as margens superior e inferior de cada um, na cor do cenário.'}</p>
      )}
      {linhas.length > 0 && comTempo.length === 0 && <p className="note">Os cenários selecionados usam o grupo B e são comparados pela tabela de A/V.</p>}
      {linhas.length > 0 && (
        <div className="tbl">
          <table className="cmp">
            <thead><tr><th>Cenário</th><th>Critério</th>{BANDAS.map((b) => <th key={b} className="num">{b}</th>)}<th>Resultado</th></tr></thead>
            <tbody>
              {linhas.map(({ c, av, cor }) => {
                const valores = av.tipo === 'absorcao' ? av.av : av.resultado.tempo[estado]
                const bandas = av.tipo === 'absorcao' ? av.bandas : av.bandas[estado]
                return [
                  <tr key={c.id}>
                    <td><i className="sw" style={{ background: cor }} />{c.nome}</td>
                    <td className="note">{av.tipo === 'absorcao' ? `A/V ≥ ${fmt(av.meta.avMinimo, 3)}` : `${av.meta.otimo ? 'T ót.' : 'T alvo'} ${fmt(av.meta.t)} s · ${av.resultado.formula === 'eyring' ? 'Eyring' : 'Sabine'}`}</td>
                    {valores.map((v, i) => <td key={i} className={`num ${CLASSE[bandas[i]]}`}>{fmt(v)}</td>)}
                    <td><span className={`pill ${av.aprovado ? 'ok' : 'bad'}`}>{av.aprovado ? 'Atende' : 'Não atende'}</span></td>
                  </tr>,
                  av.tipo === 'tempo' && (['superior', 'inferior'] as const).map((lado) => (
                    <tr key={c.id + lado} className="marg">
                      <td /><td className="note">margem {lado === 'superior' ? 'máx.' : 'mín.'}</td>
                      {av.meta[lado].map((v, i) => <td key={i} className="num muted">{fmt(v)}</td>)}
                      <td />
                    </tr>
                  )),
                ]
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
