// Tipologias de ambiente: imagem padrão dos projetos e palavras-chave do carrossel de inspirações.
// Fotos do Unsplash (Unsplash License: uso livre, inclusive comercial, sem exigir atribuição).
import type { Criterio, Projeto } from '../motor/tipos'

export type Tipologia =
  | 'sala-aula' | 'auditorio' | 'sala-musica' | 'ginasio' | 'circulacao' | 'biblioteca'
  | 'escritorio' | 'restaurante' | 'igreja' | 'sala-concerto' | 'estudio' | 'cinema'

export interface Ambiente {
  nome: string
  /** Foto no CDN do Unsplash, sem parâmetros; o tamanho é pedido na hora. */
  foto: string
  autor: string
  pagina: string
  busca: { pt: string; en: string }
}

export const AMBIENTES: Record<Tipologia, Ambiente> = {
  'sala-aula': { nome: 'Sala de aula', foto: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b', autor: 'Ivan Aleksic', pagina: 'https://unsplash.com/photos/empty-classroom-with-desks-and-chalkboard-PDRFeeDniCk', busca: { pt: 'sala de aula tratamento acústico projeto', en: 'classroom acoustic design' } },
  auditorio: { nome: 'Auditório', foto: 'https://images.unsplash.com/photo-1639408396859-38827de3a883', autor: 'November Wong', pagina: 'https://unsplash.com/photos/an-empty-auditorium-with-red-seats-and-a-projector-screen-99HfFuc8FGA', busca: { pt: 'auditório projeto acústico', en: 'auditorium acoustic design' } },
  'sala-musica': { nome: 'Sala de música', foto: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae', autor: 'John Matychuk', pagina: 'https://unsplash.com/photos/music-room-with-lights-turned-on-gUK3lA3K7Yo', busca: { pt: 'sala de ensaio tratamento acústico', en: 'music rehearsal room acoustic treatment' } },
  ginasio: { nome: 'Ginásio', foto: 'https://images.unsplash.com/photo-1691296118634-f2b245aa6f2b', autor: 'Lesli Whitecotton', pagina: 'https://unsplash.com/photos/a-basketball-hoop-in-a-gym-with-empty-bleachers-5RepGnovkpo', busca: { pt: 'ginásio esportivo tratamento acústico', en: 'sports hall acoustic treatment' } },
  circulacao: { nome: 'Hall e circulação', foto: 'https://images.unsplash.com/photo-1758448721149-aa0ce8e1b2c9', autor: 'Aalo Lens', pagina: 'https://unsplash.com/photos/modern-lobby-with-elevators-and-reception-desk-b08Pe9MV_eU', busca: { pt: 'hall de entrada forro acústico design', en: 'lobby acoustic ceiling design' } },
  biblioteca: { nome: 'Biblioteca', foto: 'https://images.unsplash.com/photo-1749671232817-1f224147f0c9', autor: 'Thomas Bormans', pagina: 'https://unsplash.com/photos/a-grand-library-filled-with-books-and-tables-7JT9sSBsW_Y', busca: { pt: 'biblioteca projeto acústico', en: 'library acoustic design' } },
  escritorio: { nome: 'Escritório', foto: 'https://images.unsplash.com/photo-1631193816258-28b44b21e78b', autor: 'Petr', pagina: 'https://unsplash.com/photos/office-workspace-with-rows-of-desks-Ugnm0F4e00U', busca: { pt: 'escritório tratamento acústico design', en: 'open office acoustic design' } },
  restaurante: { nome: 'Restaurante', foto: 'https://images.unsplash.com/photo-1692610845224-1995979c3001', autor: 'Polina Kuzovkova', pagina: 'https://unsplash.com/photos/an-empty-restaurant-with-green-tables-and-chairs--UL713I8tQk', busca: { pt: 'restaurante tratamento acústico projeto', en: 'restaurant acoustic design' } },
  igreja: { nome: 'Igreja', foto: 'https://images.unsplash.com/photo-1760872752928-c986c1f27e4e', autor: 'Peter Herrmann', pagina: 'https://unsplash.com/photos/interior-of-an-old-empty-church-with-wooden-pews-UWyJTMIK-Go', busca: { pt: 'igreja tratamento acústico', en: 'church acoustic treatment' } },
  'sala-concerto': { nome: 'Sala de concerto', foto: 'https://images.unsplash.com/photo-1458639817867-2c9d4c5dcad4', autor: 'Radek Grzybowski', pagina: 'https://unsplash.com/photos/empty-arranged-theater-YU6A5I_IjTw', busca: { pt: 'sala de concerto projeto acústico', en: 'concert hall acoustic design' } },
  estudio: { nome: 'Estúdio', foto: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04', autor: 'Caught In Joy', pagina: 'https://unsplash.com/photos/recording-studio-with-guitars-and-console-ptVBlniJi50', busca: { pt: 'estúdio de música projeto acústico', en: 'music studio acoustic design' } },
  cinema: { nome: 'Cinema', foto: 'https://images.unsplash.com/photo-1717915604557-94283edbcc1b', autor: 'Toni Pomar', pagina: 'https://unsplash.com/photos/an-empty-theater-with-red-seats-and-a-projector-screen-j5bRXs1iFy0', busca: { pt: 'cinema tratamento acústico design', en: 'cinema acoustic design' } },
}

export function tipologiaDoCriterio(c: Criterio): Tipologia {
  if (c.norma === 'A') return ({ A1: 'sala-musica', A2: 'auditorio', A3: 'sala-aula', A4: 'sala-aula', A5: 'ginasio' } as const)[c.grupo]
  if (c.norma === 'B') return ({ B2: 'circulacao', B3: 'biblioteca', B4: 'escritorio', B5: 'restaurante' } as const)[c.grupo]
  return ({ igreja: 'igreja', concerto: 'sala-concerto', musica: 'estudio', conferencia: 'cinema', palavra: 'estudio' } as const)[c.curva]
}

export const tipologiaDoProjeto = (p: Projeto) => tipologiaDoCriterio(p.cenarios[0].criterio)

/** URL da foto no tamanho pedido (o CDN do Unsplash redimensiona). */
export const fotoAmbiente = (t: Tipologia, largura = 640) =>
  AMBIENTES[t].foto ? `${AMBIENTES[t].foto}?w=${largura}&q=70&auto=format&fit=crop` : ''

export interface Inspiracao { id: string; tipologia: Tipologia; fonte: 'Pinterest' | 'ArchDaily'; idioma: 'PT' | 'EN'; termo: string; url: string }

const q = encodeURIComponent

/** Buscas no Pinterest e no ArchDaily, em português e inglês, para cada tipologia. */
export function inspiracoes(tipologias: Tipologia[]): Inspiracao[] {
  return tipologias.flatMap((t) => {
    const { pt, en } = AMBIENTES[t].busca
    return [
      { id: `${t}-pin-en`, tipologia: t, fonte: 'Pinterest', idioma: 'EN', termo: en, url: `https://br.pinterest.com/search/pins/?q=${q(en)}` },
      { id: `${t}-ad-en`, tipologia: t, fonte: 'ArchDaily', idioma: 'EN', termo: en, url: `https://www.archdaily.com/search/all?q=${q(en)}` },
      { id: `${t}-pin-pt`, tipologia: t, fonte: 'Pinterest', idioma: 'PT', termo: pt, url: `https://br.pinterest.com/search/pins/?q=${q(pt)}` },
      { id: `${t}-ad-pt`, tipologia: t, fonte: 'ArchDaily', idioma: 'PT', termo: pt, url: `https://www.archdaily.com.br/br/search/all?q=${q(pt)}` },
    ] satisfies Inspiracao[]
  })
}
