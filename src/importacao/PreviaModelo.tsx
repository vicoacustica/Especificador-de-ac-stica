import { useEffect, useMemo, useRef, useState } from 'react'
import { Icone } from '../ui/Icone'
import { caixa, CORES_LAYER, ESCALA, type Modelo, type Ponto, type Unidade } from './modelo'

const VISTA_INICIAL = { giro: -0.65, inclinacao: 0.55, zoom: 1 }
const LIMITE_FACES = 30000

/**
 * Prévia 3D do modelo em canvas: faces pintadas por layer, do fundo para a frente.
 * Arraste para girar e use a roda do mouse (ou os botões) para aproximar.
 */
export function PreviaModelo({ modelo, unidade, layers, destaque }: { modelo: Modelo; unidade: Unidade; layers: string[]; destaque?: string | null }) {
  const tela = useRef<HTMLCanvasElement>(null)
  const [vista, setVista] = useState(VISTA_INICIAL)
  const [largura, setLargura] = useState(600)
  const arrasto = useRef<{ x: number; y: number } | null>(null)

  const cor = useMemo(() => new Map(layers.map((l, i) => [l, CORES_LAYER[i % CORES_LAYER.length]])), [layers])
  // Faces em metros, centradas no meio da caixa envolvente.
  const faces = useMemo(() => {
    const e = ESCALA[unidade]
    const cx = caixa(modelo.faces, e)
    const centro: Ponto = [0, 1, 2].map((k) => (cx.min[k] + cx.max[k]) / 2) as Ponto
    const raio = Math.max(1e-6, Math.hypot(cx.max[0] - cx.min[0], cx.max[1] - cx.min[1], cx.max[2] - cx.min[2]) / 2)
    return {
      raio,
      lista: modelo.faces.slice(0, LIMITE_FACES).map((f) => ({ layer: f.layer, pontos: f.pontos.map((p) => p.map((v, k) => v * e - centro[k]) as Ponto) })),
    }
  }, [modelo, unidade])

  useEffect(() => {
    const el = tela.current?.parentElement
    if (!el) return
    const obs = new ResizeObserver(([r]) => setLargura(Math.max(240, Math.floor(r.contentRect.width))))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // A roda do mouse aproxima sem rolar a janela (o onWheel do React é passivo).
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

  const altura = Math.round(Math.min(380, Math.max(220, largura * 0.55)))

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
    const escala = (Math.min(largura, altura) / 2 / faces.raio) * 0.9 * zoom
    // Gira em torno do eixo vertical (z) e inclina a câmera de cima para baixo; y' é a profundidade.
    const ver = ([x, y, z]: Ponto): Ponto => {
      const x1 = x * cg - y * sg, y1 = x * sg + y * cg
      return [x1, y1 * ci - z * si, y1 * si + z * ci]
    }
    const luz: Ponto = [0.35, -0.55, 0.75]
    const desenho = faces.lista.map((f) => {
      const p = f.pontos.map(ver)
      // Normal na vista para sombrear: faces de frente para a luz ficam mais claras.
      let nx = 0, ny = 0, nz = 0
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length]
        nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1])
      }
      const m = Math.hypot(nx, ny, nz) || 1
      const luzF = Math.abs((nx * luz[0] + ny * luz[1] + nz * luz[2]) / m)
      return { layer: f.layer, p, prof: p.reduce((s, q) => s + q[1], 0) / p.length, luz: luzF }
    }).sort((a, b) => b.prof - a.prof)

    g.lineJoin = 'round'
    for (const d of desenho) {
      const apagada = destaque && d.layer !== destaque
      g.beginPath()
      d.p.forEach(([x, , z], i) => {
        const sx = largura / 2 + x * escala, sy = altura / 2 - z * escala
        if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy)
      })
      g.closePath()
      // Faces translúcidas, para ver o interior da sala através do forro e das paredes.
      g.globalAlpha = apagada ? 0.06 : destaque ? 0.85 : 0.22 + 0.33 * d.luz
      g.fillStyle = cor.get(d.layer) ?? '#999'
      g.fill()
      g.globalAlpha = apagada ? 0.18 : 0.85
      g.strokeStyle = '#2b2622'
      g.lineWidth = 0.6
      g.stroke()
    }
    g.globalAlpha = 1
  }, [faces, vista, largura, altura, cor, destaque])

  return (
    <div className="previa-modelo">
      <canvas
        ref={tela}
        style={{ width: largura, height: altura }}
        role="img"
        aria-label="Prévia 3D do modelo. Arraste para girar."
        onPointerDown={(e) => { arrasto.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId) }}
        onPointerMove={(e) => {
          const a = arrasto.current
          if (!a) return
          const dx = e.clientX - a.x, dy = e.clientY - a.y
          arrasto.current = { x: e.clientX, y: e.clientY }
          setVista((v) => ({ ...v, giro: v.giro + dx * 0.01, inclinacao: Math.max(-1.5, Math.min(1.5, v.inclinacao + dy * 0.01)) }))
        }}
        onPointerUp={() => { arrasto.current = null }}
      />
      <div className="previa-controles">
        <button type="button" className="icone-btn" aria-label="Aproximar" onClick={() => setVista((v) => ({ ...v, zoom: Math.min(6, v.zoom * 1.2) }))}><Icone nome="mais" tamanho={16} /></button>
        <button type="button" className="icone-btn" aria-label="Afastar" onClick={() => setVista((v) => ({ ...v, zoom: Math.max(0.3, v.zoom / 1.2) }))}><span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>−</span></button>
        <button type="button" className="btn fantasma pequeno" onClick={() => setVista(VISTA_INICIAL)}>Vista inicial</button>
      </div>
      <span className="previa-dica">Arraste para girar · role para aproximar{modelo.faces.length > LIMITE_FACES ? ` · mostrando ${LIMITE_FACES} de ${modelo.faces.length} faces` : ''}</span>
    </div>
  )
}
