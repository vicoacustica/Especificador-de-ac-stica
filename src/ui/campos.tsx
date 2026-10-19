import { useState, type ReactNode } from 'react'
import { nomeCategoria } from '../motor/materiais'
import type { Material } from '../motor/tipos'

/** Campo numérico que só confirma o valor ao sair do campo ou com Enter, para não recalcular a cada tecla. */
export function Numero(props: {
  valor: number | undefined
  aoMudar: (v: number) => void
  passo?: number
  minimo?: number
  rotulo?: string
  id?: string
  largura?: number
}) {
  const [texto, setTexto] = useState<string | null>(null)
  const confirmar = () => {
    if (texto === null) return
    const v = parseFloat(texto.replace(',', '.'))
    setTexto(null)
    if (!Number.isNaN(v)) props.aoMudar(props.minimo !== undefined ? Math.max(props.minimo, v) : v)
  }
  return (
    <input
      id={props.id}
      type="number"
      inputMode="decimal"
      step={props.passo ?? 0.01}
      min={props.minimo}
      aria-label={props.rotulo}
      style={props.largura ? { width: props.largura } : undefined}
      value={texto ?? (props.valor ?? '')}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => { if (e.key === 'Enter') confirmar() }}
    />
  )
}

/** Texto que confirma ao sair do campo. */
export function Texto(props: { valor: string; aoMudar: (v: string) => void; rotulo?: string; className?: string; id?: string; placeholder?: string }) {
  const [texto, setTexto] = useState<string | null>(null)
  const confirmar = () => { if (texto !== null) { props.aoMudar(texto); setTexto(null) } }
  return (
    <input
      id={props.id}
      type="text"
      className={props.className}
      aria-label={props.rotulo}
      placeholder={props.placeholder}
      value={texto ?? props.valor}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => { if (e.key === 'Enter') confirmar() }}
    />
  )
}

/** Lista de materiais agrupada por categoria, com "Material comum" primeiro. */
export function SeletorMaterial(props: { materiais: Material[]; valor: string; aoMudar: (id: string) => void; rotulo?: string; className?: string }) {
  const grupos = new Map<string, Material[]>()
  for (const m of props.materiais) grupos.set(m.tipo, [...(grupos.get(m.tipo) ?? []), m])
  const ordem = [...grupos.keys()].sort((a, b) => (a === 'MATERIAL COMUM' ? -1 : b === 'MATERIAL COMUM' ? 1 : a.localeCompare(b, 'pt-BR')))
  return (
    <select className={props.className ?? 'mat'} aria-label={props.rotulo} value={props.valor} onChange={(e) => props.aoMudar(e.target.value)}>
      {ordem.map((t) => (
        <optgroup key={t} label={nomeCategoria(t)}>
          {grupos.get(t)!.map((m) => <option key={m.id} value={m.id}>{m.nome}{m.proprio ? ' ★' : ''}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

export function Segmentado<T extends string>(props: { opcoes: { valor: T; rotulo: ReactNode }[]; valor: T; aoMudar: (v: T) => void; rotulo?: string }) {
  return (
    <div className="seg" role="group" aria-label={props.rotulo}>
      {props.opcoes.map((o) => (
        <button key={o.valor} type="button" aria-pressed={o.valor === props.valor} onClick={() => props.aoMudar(o.valor)}>{o.rotulo}</button>
      ))}
    </div>
  )
}
