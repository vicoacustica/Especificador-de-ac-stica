// Leitura de IFC (Revit, ArchiCAD e outros) com a web-ifc: a geometria dos espaços (IfcSpace) e dos
// elementos construtivos, já triangulada e em metros, com o material de cada elemento.
// Este módulo carrega o WebAssembly da web-ifc e só é importado quando o usuário abre um IFC.
import * as W from 'web-ifc'
import type { Ponto } from './modelo'
import type { ElementoIFC, EspacoIFC, ArquivoIFC, TipoElemento } from './ifc-espaco'

/** Tipos IFC lidos como elementos que delimitam o ambiente. Móveis, aberturas e instalações ficam de fora. */
const TIPOS: [number, TipoElemento][] = [
  [W.IFCWALL, 'parede'], [W.IFCWALLSTANDARDCASE, 'parede'], [W.IFCWALLELEMENTEDCASE, 'parede'],
  [W.IFCSLAB, 'laje'], [W.IFCSLABSTANDARDCASE, 'laje'], [W.IFCSLABELEMENTEDCASE, 'laje'],
  [W.IFCROOF, 'cobertura'], [W.IFCCOVERING, 'revestimento'],
  [W.IFCWINDOW, 'janela'], [W.IFCWINDOWSTANDARDCASE, 'janela'],
  [W.IFCDOOR, 'porta'], [W.IFCDOORSTANDARDCASE, 'porta'],
  [W.IFCCURTAINWALL, 'pele'], [W.IFCPLATE, 'pele'], [W.IFCPLATESTANDARDCASE, 'pele'],
  [W.IFCMEMBER, 'estrutura'], [W.IFCMEMBERSTANDARDCASE, 'estrutura'],
  [W.IFCCOLUMN, 'pilar'], [W.IFCCOLUMNSTANDARDCASE, 'pilar'], [W.IFCBEAM, 'viga'], [W.IFCBEAMSTANDARDCASE, 'viga'],
  [W.IFCSTAIR, 'escada'], [W.IFCSTAIRFLIGHT, 'escada'], [W.IFCRAMP, 'escada'], [W.IFCRAMPFLIGHT, 'escada'],
  [W.IFCRAILING, 'guarda'], [W.IFCBUILDINGELEMENTPROXY, 'outro'],
]

const txt = (v: unknown): string => (v && typeof v === 'object' && 'value' in v ? String((v as { value: unknown }).value ?? '').trim() : '')
const ref = (v: unknown): number | null => (v && typeof v === 'object' && 'value' in v && typeof (v as { value: unknown }).value === 'number' ? (v as { value: number }).value : null)
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/** Abre o IFC e devolve espaços e elementos. `localizarWasm` aponta o arquivo .wasm no navegador. */
export async function lerIFC(dados: Uint8Array, localizarWasm?: (arquivo: string) => string): Promise<ArquivoIFC> {
  const api = new W.IfcAPI()
  await api.Init(localizarWasm ? (caminho) => localizarWasm(caminho) : undefined, true)
  const m = api.OpenModel(dados, { COORDINATE_TO_ORIGIN: false })
  try {
    const schema = api.GetModelSchema(m)
    const linha = (id: number) => api.GetLine(m, id)
    const ids = (tipo: number) => { const v = api.GetLineIDsWithType(m, tipo); const r: number[] = []; for (let i = 0; i < v.size(); i++) r.push(v.get(i)); return r }

    // Nome do material: o nome do conjunto de camadas, ou os materiais em sequência.
    const nomeMaterial = (id: number | null, prof = 0): string => {
      if (id === null || prof > 4) return ''
      const l = linha(id)
      switch (api.GetLineType(m, id)) {
        case W.IFCMATERIAL: return txt(l.Name)
        case W.IFCMATERIALLAYERSETUSAGE: return nomeMaterial(ref(l.ForLayerSet), prof + 1)
        case W.IFCMATERIALLAYERSET: return txt(l.LayerSetName) || juntar(lista(l.MaterialLayers).map((c) => nomeMaterial(ref(c), prof + 1)))
        case W.IFCMATERIALLAYER: return nomeMaterial(ref(l.Material), prof + 1)
        case W.IFCMATERIALLIST: return juntar(lista(l.Materials).map((c) => nomeMaterial(ref(c), prof + 1)))
        case W.IFCMATERIALCONSTITUENTSET: return txt(l.Name) || juntar(lista(l.MaterialConstituents).map((c) => nomeMaterial(ref(c), prof + 1)))
        case W.IFCMATERIALCONSTITUENT: return nomeMaterial(ref(l.Material), prof + 1)
        case W.IFCMATERIALPROFILESETUSAGE: return nomeMaterial(ref(l.ForProfileSet), prof + 1)
        case W.IFCMATERIALPROFILESET: return txt(l.Name) || juntar(lista(l.MaterialProfiles).map((c) => nomeMaterial(ref(c), prof + 1)))
        case W.IFCMATERIALPROFILE: return nomeMaterial(ref(l.Material), prof + 1)
        default: return ''
      }
    }
    const material = new Map<number, string>()
    for (const r of ids(W.IFCRELASSOCIATESMATERIAL)) {
      const l = linha(r)
      const nome = nomeMaterial(ref(l.RelatingMaterial))
      if (nome) for (const o of lista(l.RelatedObjects)) { const id = ref(o); if (id !== null) material.set(id, nome) }
    }
    // Sem material no elemento, vale o do tipo (IfcWallType etc.), e o nome do tipo serve de rótulo.
    const tipoDe = new Map<number, number>()
    for (const r of ids(W.IFCRELDEFINESBYTYPE)) {
      const l = linha(r)
      const t = ref(l.RelatingType)
      if (t !== null) for (const o of lista(l.RelatedObjects)) { const id = ref(o); if (id !== null) tipoDe.set(id, t) }
    }

    const triangulos = (id: number): Float32Array => {
      const partes: number[] = []
      const malha = api.GetFlatMesh(m, id)
      for (let g = 0; g < malha.geometries.size(); g++) {
        const pg = malha.geometries.get(g)
        const geo = api.GetGeometry(m, pg.geometryExpressID)
        const v = api.GetVertexArray(geo.GetVertexData(), geo.GetVertexDataSize())
        const ix = api.GetIndexArray(geo.GetIndexData(), geo.GetIndexDataSize())
        const T = pg.flatTransformation
        for (const i of ix) {
          const x = v[i * 6], y = v[i * 6 + 1], z = v[i * 6 + 2]
          const X = T[0] * x + T[4] * y + T[8] * z + T[12]
          const Y = T[1] * x + T[5] * y + T[9] * z + T[13]
          const Z = T[2] * x + T[6] * y + T[10] * z + T[14]
          // A web-ifc entrega com y para cima; o IFC (e o resto do programa) usa z para cima.
          partes.push(X, -Z, Y)
        }
        geo.delete()
      }
      malha.delete?.()
      return new Float32Array(partes)
    }
    const caixa = (t: Float32Array): { min: Ponto; max: Ponto } => {
      const min: Ponto = [Infinity, Infinity, Infinity], max: Ponto = [-Infinity, -Infinity, -Infinity]
      for (let i = 0; i < t.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], t[i + k]); max[k] = Math.max(max[k], t[i + k]) }
      return { min, max }
    }

    const espacos: EspacoIFC[] = []
    for (const id of ids(W.IFCSPACE)) {
      const t = triangulos(id)
      if (!t.length) continue
      const l = linha(id)
      espacos.push({ id, nome: txt(l.Name), nomeLongo: txt(l.LongName), triangulos: t, ...caixa(t) })
    }

    const elementos: ElementoIFC[] = []
    for (const [codigo, tipo] of TIPOS) {
      for (const id of ids(codigo)) {
        const t = triangulos(id)
        if (!t.length) continue
        const l = linha(id)
        const tipoObj = tipoDe.get(id)
        const nomeTipo = tipoObj !== undefined ? txt(linha(tipoObj).Name) : ''
        const mat = material.get(id) || (tipoObj !== undefined ? material.get(tipoObj) : '') || ''
        const predefinido = txt(l.PredefinedType)
        elementos.push({ id, tipo, predefinido, nome: mat || nomeTipo || txt(l.ObjectType) || txt(l.Name), triangulos: t, ...caixa(t) })
      }
    }
    return { schema, espacos, elementos }
  } finally {
    api.CloseModel(m)
  }
}

function juntar(nomes: string[]): string {
  return [...new Set(nomes.filter(Boolean))].join(' + ')
}
