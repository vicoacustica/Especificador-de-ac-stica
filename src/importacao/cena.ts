// Modelo 3D guardado no projeto: faces para o visor e cores pelo material de cada superfície.
import type { Cenario, ModeloProjeto } from '../motor/tipos'
import { coresDosMateriais, type Ponto } from './modelo'
import type { FaceVisor } from './Visor3D'

const SEM_SUPERFICIE = '#bdb5a8'

/** Faces do modelo guardado no projeto, prontas para o visor. */
export function facesDoModelo(m: ModeloProjeto): FaceVisor[] {
  return m.faces.map((f) => {
    const pontos: Ponto[] = []
    for (let i = 0; i + 2 < f.p.length; i += 3) pontos.push([f.p[i], f.p[i + 1], f.p[i + 2]])
    return { c: f.g, pontos }
  })
}

/** Cor de cada grupo do modelo pelo material da superfície ligada a ele. */
export function coresDoCenario(cenario: Cenario) {
  const porId = new Map(cenario.superficies.map((s) => [s.id, s]))
  const cores = coresDosMateriais(cenario.superficies.map((s) => s.material))
  return {
    cores,
    superficieDo: (g: string) => porId.get(cenario.grupos?.[g] ?? ''),
    cor: (g: string) => {
      const s = porId.get(cenario.grupos?.[g] ?? '')
      return s ? cores.get(s.material) ?? SEM_SUPERFICIE : SEM_SUPERFICIE
    },
  }
}

