// Aparência do programa: estilo visual, cor de destaque e modo claro ou escuro, guardados no navegador.

export type Estilo = 'classico' | 'grade'
export type Tema = 'claro' | 'escuro'

export interface Aparencia {
  estilo: Estilo
  tema: Tema
  /** Id da cor de destaque em PALETA. */
  destaque: string
}

/** Cores de destaque dos dois estilos (o id interno do Brutalista continua 'grade'); `tinta` é a cor do texto sobre o destaque. */
export const PALETA: { id: string; nome: string; cor: string; tinta: string }[] = [
  { id: 'laranja', nome: 'Laranja Viço', cor: '#e0523e', tinta: '#ffffff' },
  { id: 'azul', nome: 'Azul', cor: '#2f6fed', tinta: '#ffffff' },
  { id: 'turquesa', nome: 'Turquesa', cor: '#0f9e9a', tinta: '#ffffff' },
  { id: 'verde', nome: 'Verde', cor: '#2e9e5b', tinta: '#ffffff' },
  { id: 'amarelo', nome: 'Amarelo', cor: '#f2b705', tinta: '#141414' },
  { id: 'rosa', nome: 'Rosa', cor: '#e5487d', tinta: '#ffffff' },
  { id: 'roxo', nome: 'Roxo', cor: '#7a5af8', tinta: '#ffffff' },
  { id: 'grafite', nome: 'Grafite', cor: '#4a5160', tinta: '#ffffff' },
]

export const NOME_ESTILO: Record<Estilo, { nome: string; descricao: string }> = {
  classico: { nome: 'Clássico', descricao: 'Off-white, cantos arredondados e fonte Onest.' },
  grade: { nome: 'Brutalista', descricao: 'Neobrutalismo minimalista: bordas pretas, sombras sólidas e fonte Space Mono.' },
}

const CHAVE = 'especificador:aparencia:v1'
export const APARENCIA_PADRAO: Aparencia = { estilo: 'classico', tema: 'claro', destaque: 'laranja' }

export function lerAparencia(): Aparencia {
  try {
    const t = localStorage.getItem(CHAVE)
    return t ? { ...APARENCIA_PADRAO, ...JSON.parse(t) } : APARENCIA_PADRAO
  } catch {
    return APARENCIA_PADRAO
  }
}

export function salvarAparencia(a: Aparencia) {
  try { localStorage.setItem(CHAVE, JSON.stringify(a)) } catch { /* armazenamento bloqueado: vale só nesta sessão */ }
}

/** Aplica no documento: estilo, modo claro ou escuro e cor de destaque valem para os dois estilos. */
export function aplicarAparencia(a: Aparencia) {
  const raiz = document.documentElement
  raiz.dataset.estilo = a.estilo
  raiz.dataset.tema = a.tema
  const cor = PALETA.find((p) => p.id === a.destaque) ?? PALETA[0]
  raiz.style.setProperty('--accent', cor.cor)
  raiz.style.setProperty('--accent-ink', cor.tinta)
  raiz.style.colorScheme = a.tema === 'escuro' ? 'dark' : 'light'
}
