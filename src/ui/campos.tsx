import { useState, type ReactNode } from 'react'
import { nomeCategoria } from '../motor/materiais'
import { Icone } from './Icone'
import { BarrasAlfa, MiniaturaMaterial } from './MaterialVisual'
import { Modal } from './Modal'
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

/** Campo de escolha de material: mostra a miniatura e abre o seletor com prévias. */
export function SeletorMaterial(props: { materiais: Material[]; valor: string; aoMudar: (id: string) => void; rotulo?: string; className?: string }) {
  const [aberto, setAberto] = useState(false)
  const atual = props.materiais.find((m) => m.id === props.valor)
  return (
    <>
      <button type="button" className={`campo-material ${props.className ?? ''}`} aria-label={`${props.rotulo ?? 'Material'}: ${atual?.nome ?? 'escolher'}`} onClick={() => setAberto(true)}>
        {atual ? <MiniaturaMaterial material={atual} tamanho={36} /> : <span className="miniatura" style={{ width: 36, height: 36 }} />}
        <span className="campo-material-texto">
          <b>{atual?.nome ?? 'Escolher material'}</b>
          <small>{atual ? `${nomeCategoria(atual.tipo)} · α500 ${atual.alfa[2].toLocaleString('pt-BR')}` : ''}</small>
        </span>
        {atual && <BarrasAlfa alfa={atual.alfa} unidade={atual.unidade} />}
        <Icone nome="editar" tamanho={16} />
      </button>
      {aberto && (
        <EscolhaMaterial
          titulo={props.rotulo ?? 'Escolher material'}
          materiais={props.materiais}
          valor={props.valor}
          aoEscolher={(id) => { props.aoMudar(id); setAberto(false) }}
          aoFechar={() => setAberto(false)}
        />
      )}
    </>
  )
}

const LIMITE_CARTOES = 120

/** Janela com busca, filtro por categoria e cartões com a prévia de cada material. */
export function EscolhaMaterial(props: { titulo: string; materiais: Material[]; valor?: string; aoEscolher: (id: string) => void; aoFechar: () => void }) {
  const [busca, setBusca] = useState('')
  const atual = props.materiais.find((m) => m.id === props.valor)
  const [categoria, setCategoria] = useState<string>(atual?.tipo ?? 'todas')
  const categorias = [...new Set(props.materiais.map((m) => m.tipo))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const termo = busca.trim().toLowerCase()
  const filtrados = props.materiais.filter((m) => (termo ? m.nome.toLowerCase().includes(termo) : categoria === 'todas' || m.tipo === categoria))
  return (
    <Modal titulo={props.titulo} aoFechar={props.aoFechar} largo>
      <div className="busca">
        <Icone nome="busca" />
        <input type="search" placeholder="Buscar por nome ou fabricante (ex.: SONEX, AMBI, ECOPHON)" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {!termo && (
        <div className="chips">
          <button type="button" className="chip" aria-pressed={categoria === 'todas'} onClick={() => setCategoria('todas')}>Todas</button>
          {categorias.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={categoria === c} onClick={() => setCategoria(c)}>
              {nomeCategoria(c)} <span className="contagem">{props.materiais.filter((m) => m.tipo === c).length}</span>
            </button>
          ))}
        </div>
      )}
      <div className="grade-materiais">
        {filtrados.slice(0, LIMITE_CARTOES).map((m) => (
          <button key={m.id} type="button" className="cartao-material" aria-pressed={m.id === props.valor} onClick={() => props.aoEscolher(m.id)}>
            <MiniaturaMaterial material={m} />
            <span className="cartao-material-texto">
              <b>{m.nome}</b>
              <small>{nomeCategoria(m.tipo)}{m.proprio ? ' · meu material' : ''}</small>
            </span>
            <span className="cartao-material-alfa">
              <BarrasAlfa alfa={m.alfa} unidade={m.unidade} />
              <small>α500 {m.alfa[2].toLocaleString('pt-BR')}</small>
            </span>
          </button>
        ))}
      </div>
      {filtrados.length > LIMITE_CARTOES && <p className="nota">Mostrando {LIMITE_CARTOES} de {filtrados.length}. Use a busca ou uma categoria para refinar.</p>}
      {!filtrados.length && <p className="nota">Nenhum material encontrado com esse nome.</p>}
    </Modal>
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
