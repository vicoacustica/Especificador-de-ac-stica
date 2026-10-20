import { useEffect, useMemo, useRef, useState } from 'react'
import { Icone } from '../ui/Icone'
import type { Ponto } from './modelo'

/** Face pronta para desenhar: chave do grupo (layer ou superfície) e pontos em metros. */
export interface FaceVisor { c: string; pontos: Ponto[] }

interface Props {
  faces: FaceVisor[]
  cor: (c: string) => string
  /** Grupos em destaque: os demais ficam apagados. */
  destaque?: string | string[] | null
  /** Grupo selecionado: contorno reforçado. */
  selecionado?: string | null
  ocultos?: Set<string>
  aoClicar?: (c: string | null) => void
  /** Material solto (arrastado da biblioteca) sobre um grupo. */
  aoSoltar?: (c: string, dado: string) => void
  rotulo?: string
}

const VISTA_INICIAL = { giro: -0.65, inclinacao: 0.55, zoom: 1 }
const LIMITE_FACES = 30000
type Projetada = { c: string; tela: [number, number][]; prof: number }

function dentro(x: number, y: number, p: [number, number][]) {
  let ok = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok
  }
  return ok
}

/**
 * Visor 3D em canvas: faces translúcidas pintadas do fundo para a frente, para ver o interior da sala.
 * Arraste para girar, role para aproximar, clique para escolher e solte materiais sobre as faces.
 */
export function Visor3D({ faces, cor, destaque, selecionado, ocultos, aoClicar, aoSoltar, rotulo = 'Modelo 3D. Arraste para girar.' }: Props) {
  const tela = useRef<HTMLCanvasElement>(null)
  const [vista, setVista] = useState(VISTA_INICIAL)
  const [largura, setLargura] = useState(600)
  const [sobre, setSobre] = useState<string | null>(null)
  const arrasto = useRef<{ x: number; y: number; moveu: boolean } | null>(null)
  const projetadas = useRef<Projetada[]>([])

  // Centraliza no meio da caixa envolvente e mede o raio para enquadrar.
  const cena = useMemo(() => {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
    for (const f of faces) for (const p of f.pontos) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]) }
    const centro = [0, 1, 2].map((k) => (min[k] + max[k]) / 2)
    const raio = Math.max(1e-6, Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2)
    return { raio, lista: faces.slice(0, LIMITE_FACES).map((f) => ({ c: f.c, pontos: f.pontos.map((p) => p.map((v, k) => v - centro[k]) as Ponto) })) }
  }, [faces])

  useEffect(() => {
    const el = tela.current?.parentElement
    if (!el) return
    const obs = new ResizeObserver(([r]) => setLargura(Math.max(240, Math.floor(r.contentRect.width))))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // A roda do mouse aproxima sem rolar a página (o onWheel do React é passivo).
  useEffect(() => {
    const c = tela.current
    if (!c) return
    const roda = (e: WheelEvent) => {
      e.preventDefault()
      setVista((v) => ({ ...v, zoom: Math.max(0.3, Math.min(6, v.zoom * (e.deltaY < 0 ? 1.1 : 0.9))) }))
    }
    c.addEventListener('wheel', roda, { passive: false })
    return () => c.removeEventListener('wheel', roda)
  }, [])

  const altura = Math.round(Math.min(420, Math.max(220, largura * 0.6)))
  const realce = useMemo(() => {
    const r = sobre ?? destaque
    return r ? new Set(Array.isArray(r) ? r : [r]) : null
  }, [sobre, destaque])

  useEffect(() => {
    const c = tela.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = largura * dpr
    c.height = altura * dpr
    const g = c.getContext('2d')
    if (!g) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, largura, altura)

    const { giro, inclinacao, zoom } = vista
    const cg = Math.cos(giro), sg = Math.sin(giro), ci = Math.cos(inclinacao), si = Math.sin(inclinacao)
    const escala = (Math.min(largura, altura) / 2 / cena.raio) * 0.9 * zoom
    // Gira em torno do eixo vertical (z) e inclina a câmera de cima para baixo; y' é a profundidade.
    const ver = ([x, y, z]: Ponto): Ponto => {
      const x1 = x * cg - y * sg, y1 = x * sg + y * cg
      return [x1, y1 * ci - z * si, y1 * si + z * ci]
    }
    const luz: Ponto = [0.35, -0.55, 0.75]
    const desenho = cena.lista.filter((f) => !ocultos?.has(f.c)).map((f) => {
      const p = f.pontos.map(ver)
      let nx = 0, ny = 0, nz = 0
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length]
        nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1])
      }
      const m = Math.hypot(nx, ny, nz) || 1
      return {
        c: f.c,
        tela: p.map(([x, , z]) => [largura / 2 + x * escala, altura / 2 - z * escala] as [number, number]),
        prof: p.reduce((s, q) => s + q[1], 0) / p.length,
        luz: Math.abs((nx * luz[0] + ny * luz[1] + nz * luz[2]) / m),
      }
    }).sort((a, b) => b.prof - a.prof)
    projetadas.current = desenho

    g.lineJoin = 'round'
    for (const d of desenho) {
      const apagada = realce && !realce.has(d.c)
      g.beginPath()
      d.tela.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
      g.closePath()
      // Faces translúcidas, para ver o interior através do forro e das paredes.
      g.globalAlpha = apagada ? 0.06 : realce ? 0.85 : 0.22 + 0.33 * d.luz
      g.fillStyle = cor(d.c)
      g.fill()
      const marcada = d.c === selecionado
      g.globalAlpha = apagada ? 0.18 : marcada ? 1 : 0.85
      g.strokeStyle = marcada ? '#e0523e' : '#2b2622'
      g.lineWidth = marcada ? 2.4 : 0.6
      g.stroke()
    }
    g.globalAlpha = 1
  }, [cena, vista, largura, altura, cor, realce, selecionado, ocultos])

  /** Grupo da face mais próxima sob o ponto da tela. */
  function escolher(clienteX: number, clienteY: number): string | null {
    const r = tela.current!.getBoundingClientRect()
    const x = clienteX - r.left, y = clienteY - r.top
    const lista = projetadas.current
    for (let i = lista.length - 1; i >= 0; i--) if (dentro(x, y, lista[i].tela)) return lista[i].c
    return null
  }

  return (
    <div className="previa-modelo">
      <canvas
        ref={tela}
        style={{ width: largura, height: altura }}
        role="img"
        aria-label={rotulo}
        onPointerDown={(e) => { arrasto.current = { x: e.clientX, y: e.clientY, moveu: false }; e.currentTarget.setPointerCapture(e.pointerId) }}
        onPointerMove={(e) => {
          const a = arrasto.current
          if (!a) return
          const dx = e.clientX - a.x, dy = e.clientY - a.y
          if (!a.moveu && Math.hypot(dx, dy) < 4) return
          a.moveu = true
          a.x = e.clientX; a.y = e.clientY
          setVista((v) => ({ ...v, giro: v.giro + dx * 0.01, inclinacao: Math.max(-1.5, Math.min(1.5, v.inclinacao + dy * 0.01)) }))
        }}
        onPointerUp={(e) => {
          const a = arrasto.current
          arrasto.current = null
          if (a && !a.moveu && aoClicar) aoClicar(escolher(e.clientX, e.clientY))
        }}
        onDragOver={aoSoltar ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setSobre(escolher(e.clientX, e.clientY)) } : undefined}
        onDragLeave={() => setSobre(null)}
        onDrop={aoSoltar ? (e) => {
          e.preventDefault()
          setSobre(null)
          const c = escolher(e.clientX, e.clientY)
          const dado = e.dataTransfer.getData('text/plain')
          if (c && dado) aoSoltar(c, dado)
        } : undefined}
      />
      <div className="previa-controles">
        <button type="button" className="icone-btn" aria-label="Aproximar" onClick={() => setVista((v) => ({ ...v, zoom: Math.min(6, v.zoom * 1.2) }))}><Icone nome="mais" tamanho={16} /></button>
        <button type="button" className="icone-btn" aria-label="Afastar" onClick={() => setVista((v) => ({ ...v, zoom: Math.max(0.3, v.zoom / 1.2) }))}><span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>−</span></button>
        <button type="button" className="btn fantasma pequeno" onClick={() => setVista(VISTA_INICIAL)}>Vista inicial</button>
      </div>
      <span className="previa-dica">Arraste para girar · role para aproximar{aoClicar ? ' · clique numa face para escolher' : ''}{faces.length > LIMITE_FACES ? ` · mostrando ${LIMITE_FACES} de ${faces.length} faces` : ''}</span>
    </div>
  )
}
