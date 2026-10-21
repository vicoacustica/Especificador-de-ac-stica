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
  { id: 'violao', nome: 'Violão flamenco', arquivo: 'violao.mp3', descricao: 'Violão solo gravado em câmara anecoica.', credito: 'Cologne University of Applied Sciences - Anechoic Recordings, Michio Woirgardt, Philipp Stade, Jeffrey Amankwor, Benjamin Bernschütz e Johannes Arend, 2012', licenca: 'CC BY-SA 3.0', fonte: 'http://audiogroup.web.th-koeln.de/anechoic.html' },
  { id: 'canto', nome: 'Canto lírico', arquivo: 'canto.mp3', descricao: 'Frase de voz lírica feminina gravada em câmara anecoica.', credito: 'Operatic voice, biblioteca anecoica OpenAIR (University of York), www.openairlib.net', licenca: 'CC BY-SA 3.0', fonte: 'https://www.openair.hosted.york.ac.uk/' },
  { id: 'castanholas', nome: 'Castanholas', arquivo: 'castanholas.mp3', descricao: 'Ritmo de castanholas sem sala: ataques curtos que deixam ouvir ecos e reflexões.', credito: 'Castanets (dry), Matthias Frank, IEM Graz', licenca: 'CC0' },
  { id: 'estalo', nome: 'Estalo (impulso)', descricao: 'Um estalo curto, gerado no navegador: deixa ouvir a resposta da sala sozinha.', credito: 'Gerado pelo programa', licenca: 'Livre' },
]
