import { useEffect, useRef, type ReactNode } from 'react'
import { Icone } from './Icone'

export function Modal({ titulo, aoFechar, children, largo }: { titulo: string; aoFechar: () => void; children: ReactNode; largo?: boolean }) {
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    caixa.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.modal-fechar)')?.focus()
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar() }
    document.addEventListener('keydown', tecla)
    document.body.classList.add('com-modal')
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.classList.remove('com-modal')
      anterior?.focus()
    }
  }, [aoFechar])
  return (
    <div className="modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar() }}>
      <div className={`modal ${largo ? 'largo' : ''}`} role="dialog" aria-modal="true" aria-label={titulo} ref={caixa}>
        <header className="modal-topo">
          <h2>{titulo}</h2>
          <button type="button" className="icone-btn modal-fechar" aria-label="Fechar" onClick={aoFechar}><Icone nome="fechar" /></button>
        </header>
        <div className="modal-corpo">{children}</div>
      </div>
    </div>
  )
}
