import { useId } from 'react'
import type { Material } from '../motor/tipos'

// Texturas desenhadas por categoria, usadas enquanto o material não tem foto enviada pelo usuário.
function Textura({ tipo }: { tipo: string }) {
  const t = tipo.toUpperCase()
  const id = 'textura' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  let ladrilho = true
  const fundo = '#ECE8E2', traco = '#B9AFA3', forte = '#8F8377'
  let desenho
  if (t.includes('PERFURADO')) {
    desenho = Array.from({ length: 36 }, (_, k) => <circle key={k} cx={6 + (k % 6) * 12} cy={6 + Math.floor(k / 6) * 12} r={2.2} fill={forte} />)
  } else if (t.includes('LÃ')) {
    desenho = Array.from({ length: 9 }, (_, k) => <path key={k} d={`M0 ${6 + k * 8} q 18 -6 36 0 t 36 0`} stroke={traco} strokeWidth={2} fill="none" />)
  } else if (t.includes('ESPUMA')) {
    desenho = Array.from({ length: 16 }, (_, k) => <path key={k} d={`M${(k % 4) * 18} ${(Math.floor(k / 4) + 1) * 18} l9 -14 l9 14`} fill={k % 2 ? traco : forte} opacity={0.75} />)
  } else if (t.includes('MINERAL')) {
    desenho = Array.from({ length: 60 }, (_, k) => <circle key={k} cx={(k * 37) % 72} cy={(k * 53) % 72} r={(k % 3) + 0.8} fill={k % 2 ? traco : forte} />)
  } else if (t.includes('NUVEM')) {
    ladrilho = false
    desenho = [<rect key={0} x={8} y={14} width={56} height={10} rx={5} fill={forte} />, <rect key={1} x={16} y={38} width={40} height={10} rx={5} fill={traco} />, <rect key={2} x={4} y={58} width={34} height={8} rx={4} fill={traco} />]
  } else if (t.includes('BAFFLE')) {
    desenho = Array.from({ length: 6 }, (_, k) => <rect key={k} x={6 + k * 11} y={6} width={5} height={52 - (k % 2) * 12} rx={2} fill={k % 2 ? traco : forte} />)
  } else if (t.includes('CORTINA')) {
    desenho = Array.from({ length: 7 }, (_, k) => <path key={k} d={`M${k * 11} 0 q 6 36 0 72`} stroke={k % 2 ? traco : forte} strokeWidth={4} fill="none" />)
  } else if (t.includes('REFLETOR')) {
    ladrilho = false
    desenho = [0, 1, 2].map((k) => <path key={k} d={`M6 ${24 + k * 18} q 30 -18 60 0`} stroke={forte} strokeWidth={3} fill="none" />)
  } else if (t.includes('ASSENTO')) {
    ladrilho = false
    desenho = <path d="M22 18h28v26H22zM16 44h40v8H16zM20 52v14M52 52v14" stroke={forte} strokeWidth={3} fill={traco} />
  } else if (t.includes('PÚBLICO')) {
    ladrilho = false
    desenho = <path d="M36 30a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM18 64c0-12 8-22 18-22s18 10 18 22" stroke={forte} strokeWidth={3} fill={traco} />
  } else {
    desenho = Array.from({ length: 6 }, (_, linha) => Array.from({ length: 4 }, (_, k) => (
      <rect key={`${linha}-${k}`} x={k * 24 - (linha % 2) * 12} y={linha * 12} width={24} height={12} fill="none" stroke={traco} strokeWidth={1.5} />
    )))
  }
  // Texturas se repetem no tamanho original (densidade constante em qualquer cartão); ícones ficam centralizados.
  if (!ladrilho) {
    return (
      <svg viewBox="0 0 72 72" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true" style={{ background: fundo }}>
        {desenho}
      </svg>
    )
  }
  return (
    <svg width="100%" height="100%" aria-hidden="true">
      <defs>
        <pattern id={id} width={72} height={72} patternUnits="userSpaceOnUse">
          <rect width={72} height={72} fill={fundo} />
          {desenho}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Foto do material ou, sem foto, a textura da categoria. */
export function MiniaturaMaterial({ material, tamanho }: { material: Material; tamanho?: number }) {
  const estilo = tamanho ? { width: tamanho, height: tamanho } : undefined
  return (
    <span className="miniatura" style={estilo}>
      {material.imagem ? <img src={material.imagem} alt={`Foto de ${material.nome}`} /> : <Textura tipo={material.tipo} />}
    </span>
  )
}

/** Seis barras do coeficiente de absorção (α), de 125 a 4000 Hz. */
export function BarrasAlfa({ alfa, unidade }: { alfa: number[]; unidade?: boolean }) {
  const max = unidade ? Math.max(1, ...alfa) : 1.2
  return (
    <span className="barras-alfa" title={`α: ${alfa.map((a) => a.toLocaleString('pt-BR')).join(' · ')}`} aria-label={`Absorção de 125 a 4000 Hz: ${alfa.map((a) => a.toLocaleString('pt-BR')).join(', ')}`}>
      {alfa.map((a, i) => <i key={i} style={{ height: `${Math.max(4, Math.min(100, (a / max) * 100))}%` }} />)}
    </span>
  )
}
