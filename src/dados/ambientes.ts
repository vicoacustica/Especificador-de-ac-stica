// Tipologias de ambiente e as palavras-chave do carrossel de inspirações no Pinterest.
import type { Criterio, Projeto } from '../motor/tipos'

export type Tipologia =
  | 'sala-aula' | 'auditorio' | 'sala-musica' | 'ginasio' | 'circulacao' | 'biblioteca'
  | 'escritorio' | 'restaurante' | 'igreja' | 'sala-concerto' | 'estudio' | 'cinema'

export interface Ambiente {
  nome: string
  busca: { pt: string[]; en: string[] }
}

export const AMBIENTES: Record<Tipologia, Ambiente> = {
  'sala-aula': { nome: 'Sala de aula', busca: { pt: ['sala de aula tratamento acústico', 'sala de aula projeto acústico'], en: ['classroom acoustic design', 'classroom acoustic treatment'] } },
  auditorio: { nome: 'Auditório', busca: { pt: ['auditório projeto acústico', 'auditório tratamento acústico'], en: ['auditorium acoustic design', 'auditorium acoustic panels'] } },
  'sala-musica': { nome: 'Sala de música', busca: { pt: ['sala de ensaio tratamento acústico', 'sala de música projeto acústico'], en: ['music rehearsal room acoustic treatment', 'music room acoustic design'] } },
  ginasio: { nome: 'Ginásio', busca: { pt: ['ginásio tratamento acústico', 'quadra poliesportiva acústica'], en: ['sports hall acoustic treatment', 'gymnasium acoustic design'] } },
  circulacao: { nome: 'Hall e circulação', busca: { pt: ['hall de entrada forro acústico', 'recepção projeto acústico'], en: ['lobby acoustic ceiling design', 'reception acoustic design'] } },
  biblioteca: { nome: 'Biblioteca', busca: { pt: ['biblioteca projeto acústico', 'biblioteca forro acústico'], en: ['library acoustic design', 'library acoustic ceiling'] } },
  escritorio: { nome: 'Escritório', busca: { pt: ['escritório tratamento acústico', 'escritório projeto acústico'], en: ['open office acoustic design', 'office acoustic panels design'] } },
  restaurante: { nome: 'Restaurante', busca: { pt: ['restaurante tratamento acústico', 'restaurante projeto acústico'], en: ['restaurant acoustic design', 'restaurant acoustic ceiling'] } },
  igreja: { nome: 'Igreja', busca: { pt: ['igreja tratamento acústico', 'igreja projeto acústico'], en: ['church acoustic treatment', 'church acoustic design'] } },
  'sala-concerto': { nome: 'Sala de concerto', busca: { pt: ['sala de concerto projeto acústico', 'sala de concerto acústica'], en: ['concert hall acoustic design', 'concert hall acoustic panels'] } },
  estudio: { nome: 'Estúdio', busca: { pt: ['estúdio de música projeto acústico', 'estúdio de gravação tratamento acústico'], en: ['music studio acoustic design', 'recording studio acoustic treatment'] } },
  cinema: { nome: 'Cinema', busca: { pt: ['cinema tratamento acústico', 'home theater projeto acústico'], en: ['cinema acoustic design', 'home theater acoustic treatment'] } },
}

export function tipologiaDoCriterio(c: Criterio): Tipologia {
  if (c.norma === 'A') return ({ A1: 'sala-musica', A2: 'auditorio', A3: 'sala-aula', A4: 'sala-aula', A5: 'ginasio' } as const)[c.grupo]
  if (c.norma === 'B') return ({ B2: 'circulacao', B3: 'biblioteca', B4: 'escritorio', B5: 'restaurante' } as const)[c.grupo]
  return ({ igreja: 'igreja', concerto: 'sala-concerto', musica: 'estudio', conferencia: 'cinema', palavra: 'estudio' } as const)[c.curva]
}

export const tipologiaDoProjeto = (p: Projeto) => tipologiaDoCriterio(p.cenarios[0].criterio)

export interface Inspiracao { id: string; tipologia: Tipologia; idioma: 'PT' | 'EN'; termo: string; url: string }

/** Buscas no Pinterest, em português e inglês, para cada tipologia. */
export function inspiracoes(tipologias: Tipologia[]): Inspiracao[] {
  return tipologias.flatMap((t) => {
    const { pt, en } = AMBIENTES[t].busca
    const termos = en.flatMap((e, i) => [{ idioma: 'EN' as const, termo: e }, ...(pt[i] ? [{ idioma: 'PT' as const, termo: pt[i] }] : [])])
    return termos.map(({ idioma, termo }, i) => ({ id: `${t}-${i}`, tipologia: t, idioma, termo, url: `https://br.pinterest.com/search/pins/?q=${encodeURIComponent(termo)}` }))
  })
}
