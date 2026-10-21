// Biblioteca de gravações anecoicas (sem sala) para a aurilização, com autoria e licença de cada uma.
export interface AudioAnecoico {
  id: string
  nome: string
  /** Arquivo em public/audios; sem arquivo, o som é gerado no navegador. */
  arquivo?: string
  descricao: string
  credito: string
  licenca: string
  fonte?: string
}

export const AUDIOS: AudioAnecoico[] = [
  { id: 'estalo', nome: 'Estalo (impulso)', descricao: 'Um estalo curto, gerado no navegador: deixa ouvir a resposta da sala sozinha.', credito: 'Gerado pelo programa', licenca: 'Livre' },
]
