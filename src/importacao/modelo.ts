// Leitura de modelos DXF e OBJ: faces agrupadas por layer (ou grupo/material no OBJ),
// com área e orientação de cada face. O resultado vira o quadro de áreas da importação.

export type Ponto = [number, number, number]

export interface Face {
  layer: string
  pontos: Ponto[]
}

export interface Modelo {
  formato: 'DXF' | 'OBJ'
  faces: Face[]
  /** Unidade declarada no arquivo, quando houver. */
  unidade?: Unidade
  /** Entidades que existem no arquivo mas não viram faces (sólidos ACIS, malhas MESH etc.). */
  ignoradas: Record<string, number>
}

/** Cores das layers na prévia 3D e no quadro de áreas, na ordem do quadro. */
export const CORES_LAYER = ['#e0523e', '#3d7ea6', '#6a9a3a', '#c9932b', '#8a5aa8', '#2f9c8f', '#b85c8a', '#7a6a58', '#d4733a', '#4f6bb5']

export type Unidade = 'mm' | 'cm' | 'm' | 'in' | 'ft'
export const ESCALA: Record<Unidade, number> = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 }
export const NOME_UNIDADE: Record<Unidade, string> = { mm: 'milímetros', cm: 'centímetros', m: 'metros', in: 'polegadas', ft: 'pés' }

// ---------- DXF ----------

interface Entidade { tipo: string; codigos: [number, string][] }

const INSUNITS: Record<number, Unidade> = { 1: 'in', 2: 'ft', 4: 'mm', 5: 'cm', 6: 'm' }

function valor(e: Entidade, codigo: number, padrao = ''): string {
  return e.codigos.find(([c]) => c === codigo)?.[1] ?? padrao
}
const num = (e: Entidade, codigo: number, padrao = 0) => {
  const v = parseFloat(valor(e, codigo, String(padrao)))
  return Number.isFinite(v) ? v : padrao
}
const ponto = (e: Entidade, base: number): Ponto => [num(e, base), num(e, base + 10), num(e, base + 20)]

/** Separa o DXF em seções e entidades (pares código/valor). */
function lerPares(texto: string): [number, string][] {
  const linhas = texto.split(/\r?\n/)
  const pares: [number, string][] = []
  for (let i = 0; i + 1 < linhas.length; i += 2) {
    const c = parseInt(linhas[i].trim(), 10)
    if (Number.isNaN(c)) { i -= 1; continue }
    pares.push([c, linhas[i + 1].trim()])
  }
  return pares
}

function entidades(pares: [number, string][]): Entidade[] {
  const lista: Entidade[] = []
  let atual: Entidade | null = null
  for (const [c, v] of pares) {
    if (c === 0) {
      atual = { tipo: v, codigos: [] }
      lista.push(atual)
    } else atual?.codigos.push([c, v])
  }
  return lista
}

interface Bloco { base: Ponto; entidades: Entidade[] }

export function lerDXF(texto: string): Modelo {
  const todas = entidades(lerPares(texto))
  let unidade: Unidade | undefined
  const blocos = new Map<string, Bloco>()
  const raiz: Entidade[] = []
  let secao = ''
  let bloco: Bloco | null = null
  for (let i = 0; i < todas.length; i++) {
    const e = todas[i]
    if (e.tipo === 'SECTION') { secao = valor(e, 2); continue }
    if (e.tipo === 'ENDSEC') { secao = ''; continue }
    if (secao === 'BLOCKS') {
      if (e.tipo === 'BLOCK') { bloco = { base: ponto(e, 10), entidades: [] }; blocos.set(valor(e, 2), bloco); continue }
      if (e.tipo === 'ENDBLK') { bloco = null; continue }
      bloco?.entidades.push(e)
      continue
    }
    if (secao === 'ENTITIES') raiz.push(e)
  }
  // As variáveis do cabeçalho não têm código 0 entre si: $INSUNITS vem como par 9/70.
  const m = texto.match(/\$INSUNITS\s*\r?\n\s*70\s*\r?\n\s*(\d+)/)
  if (m) unidade = INSUNITS[parseInt(m[1], 10)]

  const faces: Face[] = []
  const ignoradas: Record<string, number> = {}
  const ignorar = (t: string) => { ignoradas[t] = (ignoradas[t] ?? 0) + 1 }

  type Transf = (p: Ponto) => Ponto
  function percorrer(lista: Entidade[], t: Transf, layerPai: string | null, nivel: number) {
    for (let i = 0; i < lista.length; i++) {
      const e = lista[i]
      const proprio = valor(e, 8, '0')
      const layer = layerPai && proprio === '0' ? layerPai : proprio
      const add = (pts: Ponto[]) => { if (pts.length >= 3) faces.push({ layer, pontos: pts.map(t) }) }
      switch (e.tipo) {
        case '3DFACE': {
          const p = [ponto(e, 10), ponto(e, 11), ponto(e, 12), ponto(e, 13)]
          add(iguais(p[2], p[3]) ? p.slice(0, 3) : p)
          break
        }
        case 'SOLID': {
          // SOLID 2D guarda os vértices em zigue-zague (1, 2, 4, 3).
          const p = [ponto(e, 10), ponto(e, 11), ponto(e, 13), ponto(e, 12)]
          add(iguais(p[2], p[3]) ? p.slice(0, 3) : p)
          break
        }
        case 'LWPOLYLINE': {
          if (!(num(e, 70) & 1)) break
          const z = num(e, 38)
          const xs = e.codigos.filter(([c]) => c === 10).map(([, v]) => parseFloat(v))
          const ys = e.codigos.filter(([c]) => c === 20).map(([, v]) => parseFloat(v))
          add(xs.map((x, k) => [x, ys[k] ?? 0, z] as Ponto))
          break
        }
        case 'POLYLINE': {
          const flag = num(e, 70)
          const vertices: Entidade[] = []
          while (i + 1 < lista.length && lista[i + 1].tipo === 'VERTEX') vertices.push(lista[++i])
          if (lista[i + 1]?.tipo === 'SEQEND') i++
          if (flag & 64) {
            const coords = vertices.filter((v) => num(v, 70) & 64).map((v) => ponto(v, 10))
            for (const v of vertices) {
              if (num(v, 70) & 64) continue
              const idx = [71, 72, 73, 74].map((c) => Math.abs(num(v, c))).filter((n) => n > 0)
              add(idx.map((n) => coords[n - 1]).filter(Boolean))
            }
          } else if (flag & 16) {
            const m = num(e, 71), n = num(e, 72)
            const p = vertices.map((v) => ponto(v, 10))
            for (let a = 0; a + 1 < m; a++) for (let b = 0; b + 1 < n; b++) add([p[a * n + b], p[a * n + b + 1], p[(a + 1) * n + b + 1], p[(a + 1) * n + b]])
          } else if (flag & 1) add(vertices.map((v) => ponto(v, 10)))
          break
        }
        case 'INSERT': {
          const b = blocos.get(valor(e, 2))
          if (!b || nivel > 8) break
          const ins = ponto(e, 10)
          const s: Ponto = [num(e, 41, 1), num(e, 42, 1), num(e, 43, 1)]
          const ang = (num(e, 50) * Math.PI) / 180
          const cos = Math.cos(ang), sen = Math.sin(ang)
          const tb: Transf = ([x, y, z]) => {
            const lx = (x - b.base[0]) * s[0], ly = (y - b.base[1]) * s[1], lz = (z - b.base[2]) * s[2]
            return t([ins[0] + lx * cos - ly * sen, ins[1] + lx * sen + ly * cos, ins[2] + lz])
          }
          percorrer(b.entidades, tb, layer, nivel + 1)
          break
        }
        case '3DSOLID': case 'MESH': case 'REGION': case 'SURFACE': case 'BODY': case 'PLANESURFACE':
          ignorar(e.tipo)
          break
      }
    }
  }
  percorrer(raiz, (p) => p, null, 0)
  return { formato: 'DXF', faces, unidade, ignoradas }
}

const iguais = (a: Ponto, b: Ponto) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]

// ---------- OBJ ----------

/** Lê um OBJ. Cada face fica no grupo (g/o) e no material (usemtl) em que foi declarada. */
export function lerOBJ(texto: string, agrupar: 'grupo' | 'material' = 'grupo'): Modelo {
  const v: Ponto[] = []
  const faces: Face[] = []
  let grupo = 'sem grupo', material = 'sem material'
  for (const bruta of texto.split(/\r?\n/)) {
    const l = bruta.trim()
    if (!l || l[0] === '#') continue
    const [cmd, ...resto] = l.split(/\s+/)
    if (cmd === 'v') v.push([+resto[0], +resto[1], +resto[2]])
    else if (cmd === 'g' || cmd === 'o') grupo = resto.join(' ') || 'sem grupo'
    else if (cmd === 'usemtl') material = resto.join(' ') || 'sem material'
    else if (cmd === 'f') {
      const pts = resto.map((r) => {
        const n = parseInt(r.split('/')[0], 10)
        return v[n < 0 ? v.length + n : n - 1]
      }).filter(Boolean)
      if (pts.length >= 3) faces.push({ layer: agrupar === 'material' ? material : grupo, pontos: pts })
    }
  }
  return { formato: 'OBJ', faces, ignoradas: {} }
}

/** O OBJ tem grupos e materiais diferentes, e vale oferecer as duas formas de agrupar. */
export function objTemMateriais(texto: string): boolean {
  return /^\s*usemtl\s+\S/m.test(texto)
}

// ---------- Geometria ----------

/** Normal de Newell: o módulo é o dobro da área do polígono, mesmo não convexo. */
function newell(p: Ponto[]): Ponto {
  let x = 0, y = 0, z = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length]
    x += (a[1] - b[1]) * (a[2] + b[2])
    y += (a[2] - b[2]) * (a[0] + b[0])
    z += (a[0] - b[0]) * (a[1] + b[1])
  }
  return [x, y, z]
}

export function areaFace(p: Ponto[]): number {
  const [x, y, z] = newell(p)
  return Math.hypot(x, y, z) / 2
}

export type Orientacao = 'piso' | 'parede' | 'teto' | 'inclinada'
export const NOME_ORIENTACAO: Record<Orientacao, string> = { piso: 'Piso', parede: 'Paredes', teto: 'Forro/teto', inclinada: 'Inclinadas' }

/** Horizontal até 20° de inclinação, vertical a partir de 70°. Horizontais abaixo do meio da altura são piso. */
export function orientacao(p: Ponto[], zMeio: number): Orientacao {
  const [x, y, z] = newell(p)
  const m = Math.hypot(x, y, z) || 1
  const nz = Math.abs(z / m)
  if (nz >= Math.cos((20 * Math.PI) / 180)) {
    const zc = p.reduce((a, q) => a + q[2], 0) / p.length
    return zc <= zMeio ? 'piso' : 'teto'
  }
  if (nz <= Math.sin((20 * Math.PI) / 180)) return 'parede'
  return 'inclinada'
}

export interface Caixa { min: Ponto; max: Ponto }

export function caixa(faces: Face[], escala = 1): Caixa {
  const min: Ponto = [Infinity, Infinity, Infinity], max: Ponto = [-Infinity, -Infinity, -Infinity]
  for (const f of faces) for (const p of f.pontos) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], p[k] * escala)
    max[k] = Math.max(max[k], p[k] * escala)
  }
  return { min, max }
}

/** Sem unidade no arquivo, o tamanho do modelo indica a mais provável. */
export function unidadeProvavel(m: Modelo): Unidade {
  if (m.unidade) return m.unidade
  const { min, max } = caixa(m.faces)
  const maior = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2])
  return maior > 2000 ? 'mm' : maior > 200 ? 'cm' : 'm'
}

export interface LinhaQuadro {
  /** Layer, ou layer · orientação quando separado. */
  chave: string
  layer: string
  orientacao?: Orientacao
  faces: number
  areas: Record<Orientacao, number>
  total: number
  /** Parte da área de paredes que corre ao longo do eixo maior da caixa (par x da fórmula de Fitzroy). */
  paredeX: number
}

export interface Quadro {
  linhas: LinhaQuadro[]
  caixa: Caixa
  /** Volume da caixa envolvente, em m³. */
  volumeCaixa: number
  /** Volume pelas faces, a partir do centro do modelo; só vale para modelos fechados e sem superfícies internas. */
  volumeFaces: number
  /** Área de todas as faces, em m². */
  areaTotal: number
  /** Faces com área, em metros, com a linha do quadro a que pertencem. */
  faces: FaceEmMetros[]
}

export interface FaceEmMetros { chave: string; pontos: Ponto[] }

const zero = (): Record<Orientacao, number> => ({ piso: 0, parede: 0, teto: 0, inclinada: 0 })

/** Quadro de áreas (m²) por layer, opcionalmente separado por orientação. */
export function quadroDeAreas(m: Modelo, unidade: Unidade, separar = false): Quadro {
  const e = ESCALA[unidade]
  const cx = caixa(m.faces, e)
  const zMeio = (cx.min[2] + cx.max[2]) / 2
  const centro: Ponto = [(cx.min[0] + cx.max[0]) / 2, (cx.min[1] + cx.max[1]) / 2, zMeio]
  const linhas = new Map<string, LinhaQuadro>()
  const faces: FaceEmMetros[] = []
  const eixoMaiorX = cx.max[0] - cx.min[0] >= cx.max[1] - cx.min[1]
  let volume = 0, areaTotal = 0
  for (const f of m.faces) {
    const p = f.pontos.map(([x, y, z]) => [x * e, y * e, z * e] as Ponto)
    const a = areaFace(p)
    if (a < 1e-6) continue
    const o = orientacao(p, zMeio)
    const chave = separar ? `${f.layer} · ${NOME_ORIENTACAO[o]}` : f.layer
    faces.push({ chave, pontos: p })
    let l = linhas.get(chave)
    if (!l) { l = { chave, layer: f.layer, orientacao: separar ? o : undefined, faces: 0, areas: zero(), total: 0, paredeX: 0 }; linhas.set(chave, l) }
    l.faces++
    l.areas[o] += a
    if (o === 'parede') {
      // A parede corre na direção perpendicular à normal: com o eixo maior em x, a parte "ao longo do comprimento" é ny².
      const [nx, ny] = newell(p)
      const h = nx * nx + ny * ny
      if (h > 0) l.paredeX += (a * (eixoMaiorX ? ny * ny : nx * nx)) / h
    }
    l.total += a
    areaTotal += a
    // Tetraedros entre o centro da caixa e cada triângulo, em módulo: não depende do sentido das faces,
    // e é exato para salas que o centro "enxerga" por inteiro.
    for (let k = 1; k + 1 < p.length; k++) {
      const [a0, b, c] = [p[0], p[k], p[k + 1]].map((q) => [q[0] - centro[0], q[1] - centro[1], q[2] - centro[2]])
      volume += Math.abs(a0[0] * (b[1] * c[2] - b[2] * c[1]) - a0[1] * (b[0] * c[2] - b[2] * c[0]) + a0[2] * (b[0] * c[1] - b[1] * c[0])) / 6
    }
  }
  const lado = (k: number) => Math.max(0, cx.max[k] - cx.min[k])
  return {
    linhas: [...linhas.values()].sort((a, b) => a.chave.localeCompare(b.chave, 'pt-BR')),
    caixa: cx,
    volumeCaixa: lado(0) * lado(1) * lado(2),
    volumeFaces: volume,
    areaTotal,
    faces,
  }
}

/** Orientação com mais área na linha. */
export function orientacaoPrincipal(l: LinhaQuadro): Orientacao {
  if (l.orientacao) return l.orientacao
  return (Object.keys(l.areas) as Orientacao[]).reduce((a, b) => (l.areas[b] > l.areas[a] ? b : a))
}

/** Cores dos materiais no modelo 3D, na ordem em que aparecem. */
export function coresDosMateriais(ids: string[]): Map<string, string> {
  return new Map([...new Set(ids)].map((id, i) => [id, CORES_LAYER[i % CORES_LAYER.length]]))
}
