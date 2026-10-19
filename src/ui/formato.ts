export function fmt(x: number | null | undefined, casas = 2): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—'
  return x.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

export const rotuloBanda = (b: number) => (b >= 1000 ? `${b / 1000}k` : `${b}`)
