// Aparência do programa: estilo visual, cor de destaque e modo claro ou escuro, guardados no navegador.

export type Estilo = 'classico' | 'grade'
export type Tema = 'claro' | 'escuro'

export interface Aparencia {
  estilo: Estilo
  tema: Tema
  /** Id da cor de destaque em PALETA. */
  destaque: string
}

/** Cores de destaque do estilo Brutalista (o id interno continua 'grade'); `tinta` é a cor do texto sobre o destaque. */
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
  classico: { nome: 'Clássico', descricao: 'Off-white, cantos arredondados e destaque laranja.' },
  grade: { nome: 'Brutalista', descricao: 'Neobrutalismo minimalista: bordas pretas, sombras sólidas e uma cor de destaque, com modo escuro.' },
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

/** Aplica no documento: o estilo Clássico mantém as cores originais e o modo claro. */
export function aplicarAparencia(a: Aparencia) {
  const raiz = document.documentElement
  raiz.dataset.estilo = a.estilo
  const grade = a.estilo === 'grade'
  raiz.dataset.tema = grade ? a.tema : 'claro'
  const cor = PALETA.find((p) => p.id === a.destaque) ?? PALETA[0]
  if (grade) {
    raiz.style.setProperty('--accent', cor.cor)
    raiz.style.setProperty('--accent-ink', cor.tinta)
  } else {
    raiz.style.removeProperty('--accent')
    raiz.style.removeProperty('--accent-ink')
  }
  raiz.style.colorScheme = grade && a.tema === 'escuro' ? 'dark' : 'light'
}
