import { BANDAS_GRUPO_B } from '../motor/criterios'
import { BANDAS, type PorBanda } from '../motor/tipos'
import { fmt, rotuloBanda } from '../ui/formato'

export interface Serie { cor: string; valores: (number | null)[]; margens?: { superior: PorBanda; inferior: PorBanda } }

/** Tempo de reverberação (T) por banda, com a faixa aceita sombreada ou as margens tracejadas de cada série. */
export function GraficoTempo(props: { series: Serie[]; faixa?: { superior: PorBanda; inferior: PorBanda; alvo: number }; largura?: number; rotulo: string }) {
  const W = props.largura ?? 400, H = props.largura ? 240 : 210, pl = 36, pr = 12, pt = 10, pb = 26
  const valores: number[] = []
  for (const s of props.series) {
    for (const v of s.valores) if (v !== null) valores.push(v)
    if (s.margens) valores.push(...s.margens.superior)
  }
  if (props.faixa) valores.push(...props.faixa.superior)
  const ymax = Math.max(0.5, Math.ceil(Math.min(Math.max(...valores, 0), 8) * 2) / 2)
  const x = (i: number) => pl + (i * (W - pl - pr)) / 5
  const y = (v: number) => pt + (1 - Math.min(v, ymax) / ymax) * (H - pt - pb)
  const passo = ymax <= 1.5 ? 0.25 : ymax <= 3 ? 0.5 : 1
  const grade: number[] = []
  for (let v = 0; v <= ymax + 1e-9; v += passo) grade.push(v)
  const linha = (vals: number[]) => vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={props.rotulo}>
      {grade.map((v) => (
        <g key={v}>
          <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={pl - 5} y={y(v) + 3} textAnchor="end">{fmt(v, passo < 0.5 ? 2 : 1)}</text>
        </g>
      ))}
      {BANDAS.map((b, i) => <text key={b} x={x(i)} y={H - 8} textAnchor="middle">{rotuloBanda(b)}</text>)}
      {props.faixa && (
        <>
          <polygon points={`${linha(props.faixa.superior)} ${linha([...props.faixa.inferior]).split(' ').reverse().join(' ')}`} fill="var(--band)" />
          {[props.faixa.superior, props.faixa.inferior].map((m, j) => (
            <polyline key={j} points={linha(m)} fill="none" stroke="var(--ok)" strokeWidth={1.6} strokeDasharray="6 4" />
          ))}
          <polyline points={linha(BANDAS.map(() => props.faixa!.alvo))} fill="none" stroke="var(--ok)" strokeWidth={1} opacity={0.6} />
          <text x={W - pr} y={y(props.faixa.superior[5]) - 4} textAnchor="end" style={{ fill: 'var(--ok)' }}>máx.</text>
          <text x={W - pr} y={y(props.faixa.inferior[5]) + 12} textAnchor="end" style={{ fill: 'var(--ok)' }}>mín.</text>
        </>
      )}
      {props.series.map((s, k) => {
        const pts = s.valores.map((v, i) => (v === null ? null : [x(i), y(v)])).filter((p): p is number[] => p !== null)
        return (
          <g key={k}>
            {s.margens && [s.margens.superior, s.margens.inferior].map((m, j) => (
              <polyline key={j} points={linha(m)} fill="none" stroke={s.cor} strokeWidth={1} strokeDasharray="5 4" opacity={0.8} />
            ))}
            <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={s.cor} strokeWidth={2} />
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={s.cor} />)}
          </g>
        )
      })}
    </svg>
  )
}

/** Área de absorção por volume (A/V) por banda contra o mínimo do grupo B. */
export function GraficoAV({ av, minimo }: { av: PorBanda; minimo: number }) {
  const W = 400, H = 170, pl = 40, pr = 10, pt = 14, pb = 26
  const ymax = Math.max(minimo * 1.6, ...av) * 1.08
  const bw = (W - pl - pr) / 6
  const y = (v: number) => pt + (1 - v / ymax) * (H - pt - pb)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="A/V por banda">
      <line x1={pl} x2={W - pr} y1={y(minimo)} y2={y(minimo)} stroke="var(--ok)" strokeDasharray="4 3" />
      <text x={pl - 4} y={y(minimo) + 3} textAnchor="end">{fmt(minimo, 2)}</text>
      {av.map((v, i) => {
        const conta = BANDAS_GRUPO_B.includes(i)
        const cor = !conta ? 'var(--line)' : v >= minimo ? 'var(--ok)' : 'var(--bad)'
        return (
          <g key={i}>
            <rect x={pl + i * bw + bw * 0.2} y={y(v)} width={bw * 0.6} height={y(0) - y(v)} fill={cor} rx={2} />
            <text x={pl + i * bw + bw / 2} y={H - 8} textAnchor="middle">{rotuloBanda(BANDAS[i])}</text>
            <text x={pl + i * bw + bw / 2} y={y(v) - 4} textAnchor="middle">{fmt(v, 2)}</text>
          </g>
        )
      })}
    </svg>
  )
}
