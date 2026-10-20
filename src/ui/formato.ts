export function fmt(x: number | null | undefined, casas = 2): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—'
  return x.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export const rotuloBanda = (b: number) => (b >= 1000 ? `${b / 1000}k` : `${b}`)

/** Iniciais do nome para o avatar. */
export const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'

/** Data relativa curta: "hoje", "ontem", "há 3 dias" ou a data. */
export function quando(iso: string): string {
  const d = new Date(iso)
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`
  return d.toLocaleDateString('pt-BR')
}
