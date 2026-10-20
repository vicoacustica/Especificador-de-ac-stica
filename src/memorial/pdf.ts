// Memorial de especificação acústica em PDF: identificação, plantas e vistas do modelo 3D com cotas e
// especificações, quadro de especificações, resultados dos cenários e memória de cálculo.
import { jsPDF } from 'jspdf'
import { avaliar, areaEfetiva, NOME_SITUACAO, type Avaliacao } from '../motor/acustica'
import { CURVAS_NBR, GRUPOS_B, TOLERANCIA_INFERIOR, TOLERANCIA_SUPERIOR } from '../motor/criterios'
import { ABSORCAO_AR, type Catalogo } from '../motor/materiais'
import { BANDAS, CATEGORIAS, FRACAO_OCUPADA, NOME_ESTADO, type Cenario, type Projeto } from '../motor/tipos'
import { coresDosMateriais } from '../importacao/modelo'
import { fmt } from '../ui/formato'
import { especificacao, quantidadeTexto, type ItemEspecificacao } from './conteudo'
import { analisarModelo, areaPoligono, centroide, cortarFace, marcos, naPlanta, naVista, type AnaliseModelo, type FacePlana, type P2 } from './geometria'

export interface DadosMemorial {
  projeto: Projeto
  /** Cenário especificado: desenhos, quadro e memória de cálculo. */
  cenario: Cenario
  catalogo: Catalogo
  projetista: { nome: string; registro: string; empresa: string }
  data: Date
  /** Fontes TrueType em base64 (regular e negrito). */
  fontes: { regular: string; negrito: string }
  /** Imagens dos materiais já convertidas para JPEG (data URL), por id. */
  imagens: Record<string, string>
}

type Cor = [number, number, number]
const TINTA: Cor = [33, 29, 26]
const SUAVE: Cor = [110, 102, 94]
const LINHA: Cor = [205, 197, 186]
const DESTAQUE: Cor = [224, 82, 62]
const FUNDO_COMUM: Cor = [244, 242, 238]
const FUNDO_ESQUADRIA: Cor = [226, 236, 242]
const ESCALAS = [10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000, 2000]
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const hex = (h: string): Cor => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const clarear = (c: Cor, f: number): Cor => c.map((v) => Math.round(v + (255 - v) * f)) as Cor
const escurecer = (c: Cor, f: number): Cor => c.map((v) => Math.round(v * (1 - f))) as Cor
const m = (x: number) => fmt(x, 2)

/** Menor escala usual em que o desenho cabe na área (mm). */
function escalaQueCabe(larguraM: number, alturaM: number, larguraMm: number, alturaMm: number): number {
  return ESCALAS.find((e) => (larguraM * 1000) / e <= larguraMm && (alturaM * 1000) / e <= alturaMm) ?? ESCALAS[ESCALAS.length - 1]
}

export function gerarMemorial(d: DadosMemorial): jsPDF {
  const { projeto, cenario, catalogo } = d
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  doc.addFileToVFS('LiberationSans-Regular.ttf', d.fontes.regular)
  doc.addFont('LiberationSans-Regular.ttf', 'Liberation', 'normal')
  doc.addFileToVFS('LiberationSans-Bold.ttf', d.fontes.negrito)
  doc.addFont('LiberationSans-Bold.ttf', 'Liberation', 'bold')

  const dataTexto = d.data.toLocaleDateString('pt-BR')
  const espec = especificacao(cenario, catalogo)
  const cores = coresDosMateriais([...cenario.superficies.map((s) => s.material), ...espec.map((e) => e.material.id)])
  const codigoDe = new Map(espec.filter((e) => e.unidade === 'm²').map((e) => [e.material.id, e]))
  const porId = new Map(cenario.superficies.map((s) => [s.id, s]))
  const superficieDo = (g: string) => porId.get(cenario.grupos?.[g] ?? '')
  /** Especificação do grupo do modelo, quando o material dele é acústico. */
  const especDo = (g: string): ItemEspecificacao | undefined => {
    const s = superficieDo(g)
    return s ? codigoDe.get(s.material) : undefined
  }
  const corDo = (g: string): Cor => {
    const e = especDo(g)
    if (e) return hex(cores.get(e.material.id) ?? '#999999')
    return superficieDo(g)?.categoria === 'esquadria' ? FUNDO_ESQUADRIA : FUNDO_COMUM
  }

  // ————— utilidades de página —————
  const secoes: { titulo: string; pagina: number }[] = []
  let y = 0
  const fonte = (tam: number, negrito = false, cor: Cor = TINTA) => { doc.setFont('Liberation', negrito ? 'bold' : 'normal'); doc.setFontSize(tam); doc.setTextColor(...cor) }
  const linhaFina = (cor: Cor = LINHA, larg = 0.2) => { doc.setDrawColor(...cor); doc.setLineWidth(larg) }
  const MARGEM = 18
  const LARG_RETRATO = 210 - 2 * MARGEM

  function novaRetrato() {
    doc.addPage('a4', 'portrait')
    fonte(8, false, SUAVE)
    doc.text(`Memorial de especificação acústica · ${projeto.nome}`, MARGEM, 12)
    linhaFina()
    doc.line(MARGEM, 14, 210 - MARGEM, 14)
    y = 24
  }
  const garantir = (h: number) => { if (y + h > 297 - 20) novaRetrato() }
  function secao(titulo: string, nova = true) {
    if (nova) novaRetrato()
    else garantir(20)
    secoes.push({ titulo, pagina: doc.getNumberOfPages() })
    fonte(15, true)
    doc.text(titulo, MARGEM, y)
    y += 4
    doc.setDrawColor(...DESTAQUE); doc.setLineWidth(0.6)
    doc.line(MARGEM, y, MARGEM + 18, y)
    y += 8
  }
  function subtitulo(t: string) {
    garantir(14)
    fonte(10.5, true)
    doc.text(t, MARGEM, y)
    y += 6
  }
  function paragrafo(t: string, tam = 9, cor: Cor = TINTA, larg = LARG_RETRATO) {
    fonte(tam, false, cor)
    const linhas = doc.splitTextToSize(t, larg) as string[]
    const h = linhas.length * tam * 0.42
    garantir(h + 2)
    doc.text(linhas, MARGEM, y)
    y += h + 2
  }
  /** Equação com a legenda de cada termo logo abaixo, como nos materiais da Viço Acústica. */
  function equacao(eq: string, legenda: string[], substituicao?: string) {
    garantir(10 + legenda.length * 4)
    doc.setFillColor(248, 245, 240)
    const h = 9 + (substituicao ? 5 : 0)
    doc.roundedRect(MARGEM, y - 5, LARG_RETRATO, h, 1.5, 1.5, 'F')
    fonte(10.5, true)
    doc.text(eq, MARGEM + 4, y + 0.5)
    if (substituicao) { fonte(9, false, SUAVE); doc.text(substituicao, MARGEM + 4, y + 5.5) }
    y += h
    fonte(8, false, SUAVE)
    doc.text('Onde:', MARGEM + 4, y)
    y += 4
    for (const l of legenda) {
      const linhas = doc.splitTextToSize(l, LARG_RETRATO - 10) as string[]
      garantir(linhas.length * 3.6)
      doc.text(linhas, MARGEM + 8, y)
      y += linhas.length * 3.6
    }
    y += 3
  }

  type Celula = string | { t: string; cor?: Cor; negrito?: boolean; fundo?: Cor }
  interface Coluna { titulo: string; largura: number; direita?: boolean }
  /** Tabela com quebra de texto e cabeçalho repetido a cada página. */
  function tabela(cols: Coluna[], linhas: Celula[][], tam = 7.5, alturaMin = 0, desenhar?: (linha: number, x: number, y: number, h: number) => void) {
    const total = cols.reduce((s, c) => s + c.largura, 0)
    const k = LARG_RETRATO / total
    const ws = cols.map((c) => c.largura * k)
    const lh = tam * 0.42
    const cabecalho = () => {
      doc.setFillColor(236, 231, 224)
      doc.rect(MARGEM, y, LARG_RETRATO, lh + 3, 'F')
      fonte(tam, true)
      let x = MARGEM
      cols.forEach((c, i) => { doc.text(c.titulo, c.direita ? x + ws[i] - 1.5 : x + 1.5, y + lh + 0.8, { align: c.direita ? 'right' : 'left' }); x += ws[i] })
      y += lh + 3
    }
    garantir(lh * 3 + 6)
    cabecalho()
    linhas.forEach((ln, li) => {
      const textos = ln.map((c, i) => doc.splitTextToSize(typeof c === 'string' ? c : c.t, ws[i] - 3) as string[])
      const h = Math.max(alturaMin, ...textos.map((t) => t.length * lh)) + 2.4
      if (y + h > 297 - 20) { novaRetrato(); cabecalho() }
      let x = MARGEM
      ln.forEach((c, i) => {
        const cel = typeof c === 'string' ? { t: c } : c
        if (cel.fundo) { doc.setFillColor(...cel.fundo); doc.rect(x, y, ws[i], h, 'F') }
        fonte(tam, !!cel.negrito, cel.cor ?? TINTA)
        doc.text(textos[i], cols[i].direita ? x + ws[i] - 1.5 : x + 1.5, y + lh + 0.6, { align: cols[i].direita ? 'right' : 'left' })
        x += ws[i]
      })
      desenhar?.(li, MARGEM, y, h)
      linhaFina(LINHA, 0.15)
      doc.line(MARGEM, y + h, MARGEM + LARG_RETRATO, y + h)
      y += h
    })
    y += 5
  }

  // ————— desenho técnico —————
  type Folha = { titulo: string; escala: string }
  const folhasDesenho: number[] = []
  const LEG_X = 222, LEG_W = 67
  const AREA = { x: 8, y: 8, w: LEG_X - 8 - 3, h: 164 }

  function novaPaisagem(f: Folha) {
    doc.addPage('a4', 'landscape')
    folhasDesenho.push(doc.getNumberOfPages())
    linhaFina(TINTA, 0.35)
    doc.rect(8, 8, 281, 194)
    // Carimbo
    const yc = 174
    doc.line(8, yc, 289, yc)
    const celulas: [string, string, number][] = [
      ['Projeto', projeto.nome, 70], ['Desenho', f.titulo, 62], ['Cenário', cenario.nome, 45],
      ['Projetista', [d.projetista.nome || '—', d.projetista.registro].filter(Boolean).join(' · '), 58], ['Data · escala', `${dataTexto} · ${f.escala}`, 46],
    ]
    let x = 8
    for (const [r, v, w] of celulas) {
      fonte(6.5, false, SUAVE); doc.text(r.toUpperCase(), x + 2.5, yc + 5)
      fonte(8.5, true); doc.text(doc.splitTextToSize(v, w - 5).slice(0, 3), x + 2.5, yc + 10)
      x += w
      if (x < 289) doc.line(x, yc, x, 202)
    }
    // Legenda das especificações
    doc.line(LEG_X - 3, 8, LEG_X - 3, yc)
    fonte(8, true); doc.text('ESPECIFICAÇÕES', LEG_X, 15)
    let yl = 21
    for (const e of espec) {
      if (yl > yc - 14) { fonte(7, false, SUAVE); doc.text('Continua no quadro de especificações.', LEG_X, yl); break }
      etiqueta(LEG_X + 4, yl - 1.2, e)
      fonte(7, true)
      const nome = doc.splitTextToSize(e.material.nome, LEG_W - 11).slice(0, 2) as string[]
      doc.text(nome, LEG_X + 10, yl)
      fonte(6.5, false, SUAVE)
      doc.text(quantidadeTexto(e), LEG_X + 10, yl + nome.length * 3)
      yl += nome.length * 3 + 6
    }
    fonte(6.5, false, SUAVE)
    doc.text(doc.splitTextToSize('Materiais comuns em cinza, sem código. Cotas em metros.', LEG_W - 2), LEG_X, yc - 7)
  }

  function etiqueta(x: number, yy: number, e: ItemEspecificacao) {
    const c = hex(cores.get(e.material.id) ?? '#999999')
    doc.setFillColor(...c)
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.4)
    doc.roundedRect(x - 3.6, yy - 2.2, 7.2, 4.4, 1.2, 1.2, 'FD')
    fonte(6.5, true, [255, 255, 255])
    doc.text(e.codigo, x, yy + 0.9, { align: 'center' })
  }

  function poligono(pts: P2[], estilo: 'F' | 'S' | 'FD') {
    if (pts.length < 3) return
    const deltas = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]])
    doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], estilo, true)
  }

  /** Cota alinhada entre dois pontos do papel, deslocada na direção dada (vetor unitário). */
  function cota(a: P2, b: P2, dir: P2, dist: number, texto: string, antes = false) {
    const a2: P2 = [a[0] + dir[0] * dist, a[1] + dir[1] * dist], b2: P2 = [b[0] + dir[0] * dist, b[1] + dir[1] * dist]
    linhaFina(SUAVE, 0.12)
    doc.line(a[0] + dir[0] * 1, a[1] + dir[1] * 1, a2[0] + dir[0] * 1.2, a2[1] + dir[1] * 1.2)
    doc.line(b[0] + dir[0] * 1, b[1] + dir[1] * 1, b2[0] + dir[0] * 1.2, b2[1] + dir[1] * 1.2)
    doc.setDrawColor(...TINTA); doc.setLineWidth(0.15)
    doc.line(a2[0], a2[1], b2[0], b2[1])
    const t = Math.hypot(b2[0] - a2[0], b2[1] - a2[1])
    if (t < 0.2) return
    const ux = (b2[0] - a2[0]) / t, uy = (b2[1] - a2[1]) / t
    // Traços a 45°, como nas cotas de arquitetura.
    for (const p of [a2, b2]) doc.line(p[0] - (ux - uy) * 0.9, p[1] - (uy + ux) * 0.9, p[0] + (ux - uy) * 0.9, p[1] + (uy + ux) * 0.9)
    let ang = (Math.atan2(-uy, ux) * 180) / Math.PI
    if (ang > 90.5 || ang < -89.5) ang += 180
    fonte(6.5, false, TINTA)
    // O texto fica do lado de fora da linha de cota; se não couber no trecho, vai para além da ponta.
    const larg = doc.getTextWidth(texto)
    let cx = (a2[0] + b2[0]) / 2, cy = (a2[1] + b2[1]) / 2
    if (larg > t - 0.8) {
      const p = antes ? a2 : b2, s = antes ? -1 : 1
      cx = p[0] + ux * s * (larg / 2 + 1.6); cy = p[1] + uy * s * (larg / 2 + 1.6)
    }
    doc.text(texto, cx + dir[0] * 1.7, cy + dir[1] * 1.7, { angle: ang, align: 'center', baseline: 'middle' })
  }

  /** Cadeia de cotas ao longo de um segmento do papel e a cota total, se houver trechos. */
  function cadeia(p0: P2, eixo: P2, escalaMm: number, valores: number[], dir: P2, dist = 7) {
    const v = marcos(valores)
    if (v.length < 2) return
    const pt = (u: number): P2 => [p0[0] + eixo[0] * u * escalaMm, p0[1] + eixo[1] * u * escalaMm]
    for (let i = 0; i + 1 < v.length; i++) cota(pt(v[i]), pt(v[i + 1]), dir, dist, m(v[i + 1] - v[i]), i === 0 && v.length > 2)
    if (v.length > 2) cota(pt(v[0]), pt(v[v.length - 1]), dir, dist + 7, m(v[v.length - 1] - v[0]))
  }

  function tituloDesenho(x: number, yy: number, t: string, escala: number) {
    fonte(9, true); doc.text(t, x, yy)
    const w = doc.getTextWidth(t)
    fonte(7.5, false, SUAVE); doc.text(`Escala 1:${escala}`, x + w + 3, yy)
  }

  /** Coloca uma etiqueta por grupo acústico, na maior face (ou trecho) dele no desenho. */
  type Candidato = { g: string; ponto: P2; tamanho: number; face?: FacePlana }
  function etiquetasPorGrupo(candidatos: Candidato[]): Candidato[] {
    const melhor = new Map<string, Candidato>()
    for (const c of candidatos) {
      const e = especDo(c.g)
      if (!e) continue
      const atual = melhor.get(e.codigo)
      if (!atual || c.tamanho > atual.tamanho) melhor.set(e.codigo, c)
    }
    for (const [codigo, c] of melhor) etiqueta(c.ponto[0], c.ponto[1], espec.find((e) => e.codigo === codigo)!)
    return [...melhor.values()]
  }

  function desenharPlantas(a: AnaliseModelo) {
    const W = a.max[0] - a.min[0], D = a.max[1] - a.min[1]
    const esc = escalaQueCabe(W, D, AREA.w - 52, AREA.h - 52)
    const k = 1000 / esc
    const ox = AREA.x + (AREA.w - W * k) / 2, oy = AREA.y + 10 + (AREA.h - 10 + D * k) / 2
    const P = (x: number, yy: number): P2 => [ox + (x - a.min[0]) * k, oy - (yy - a.min[1]) * k]
    const dirPapel = (v: P2): P2 => [v[0], -v[1]]

    // Trechos das paredes no plano de corte.
    const trechos = a.paredes.flatMap((w, iw) => w.faces.flatMap((f) => cortarFace(w, f, a.zCorte).map(([u0, u1]) => ({ w, iw, f, u0, u1 }))))

    // ————— Planta baixa —————
    novaPaisagem({ titulo: 'Planta baixa', escala: `1:${esc}` })
    secoes.push({ titulo: 'Planta baixa', pagina: doc.getNumberOfPages() })
    tituloDesenho(AREA.x + 4, AREA.y + 7, `PLANTA BAIXA · corte a ${m(a.zCorte - a.min[2])} m do piso`, esc)
    const pisos = [...a.pisos].sort((p, q) => Math.min(...p.pontos.map((x) => x[2])) - Math.min(...q.pontos.map((x) => x[2])))
    for (const f of pisos) {
      const c = corDo(f.g)
      doc.setFillColor(...(especDo(f.g) ? clarear(c, 0.55) : c)); linhaFina(LINHA, 0.15)
      poligono(f.pontos.map((p) => P(p[0], p[1])), 'FD')
    }
    const desenharTrecho = (t: (typeof trechos)[number], fase: 'base' | 'itens') => {
      const s = superficieDo(t.f.g)
      const cat = s?.categoria
      const base = !cat || CATEGORIAS[cat].base
      if ((fase === 'base') !== base) return
      const p0 = naPlanta(t.w, t.u0), p1 = naPlanta(t.w, t.u1)
      let A = P(p0[0], p0[1]), B = P(p1[0], p1[1])
      const e = especDo(t.f.g)
      if (cat === 'esquadria') {
        doc.setDrawColor(255, 255, 255); doc.setLineWidth(1.1); doc.line(A[0], A[1], B[0], B[1])
        const n = dirPapel(t.w.normal)
        linhaFina(TINTA, 0.18)
        for (const s2 of [-0.45, 0.45]) doc.line(A[0] + n[0] * s2, A[1] + n[1] * s2, B[0] + n[0] * s2, B[1] + n[1] * s2)
        return
      }
      if (!base) {
        // Revestimentos e elementos: faixa colorida do lado de dentro da parede.
        const n = dirPapel(t.w.normal)
        A = [A[0] + n[0] * 1.1, A[1] + n[1] * 1.1]; B = [B[0] + n[0] * 1.1, B[1] + n[1] * 1.1]
        doc.setDrawColor(...(e ? hex(cores.get(e.material.id)!) : SUAVE)); doc.setLineWidth(1.1)
        doc.line(A[0], A[1], B[0], B[1])
        return
      }
      doc.setDrawColor(...(e ? escurecer(hex(cores.get(e.material.id)!), 0.15) : TINTA)); doc.setLineWidth(0.9)
      doc.line(A[0], A[1], B[0], B[1])
    }
    trechos.forEach((t) => desenharTrecho(t, 'base'))
    trechos.forEach((t) => desenharTrecho(t, 'itens'))
    doc.setLineCap('butt')

    // Cotas: uma cadeia por parede, do lado de fora.
    a.paredes.forEach((w) => {
      const meus = trechos.filter((t) => t.w === w)
      if (!meus.length) return
      const o = naPlanta(w, 0)
      const fora = dirPapel([-w.normal[0], -w.normal[1]])
      cadeia(P(o[0], o[1]), dirPapel(w.eixo), k, [0, w.u[1], ...meus.flatMap((t) => [t.u0, t.u1])], fora)
    })
    // Indicação das vistas internas.
    a.paredes.forEach((w, i) => {
      const meio = naPlanta(w, w.u[1] / 2)
      const n = dirPapel(w.normal)
      const c = P(meio[0], meio[1])
      const q: P2 = [c[0] + n[0] * 9, c[1] + n[1] * 9]
      doc.setFillColor(...TINTA)
      const t1: P2 = [q[0] - n[0] * 5.2, q[1] - n[1] * 5.2], lado: P2 = [-n[1] * 2.2, n[0] * 2.2]
      poligono([t1, [q[0] - n[0] * 2.4 + lado[0], q[1] - n[1] * 2.4 + lado[1]], [q[0] - n[0] * 2.4 - lado[0], q[1] - n[1] * 2.4 - lado[1]]], 'F')
      doc.setFillColor(255, 255, 255); linhaFina(TINTA, 0.3)
      doc.circle(q[0], q[1], 2.8, 'FD')
      fonte(7, true); doc.text(LETRAS[i % 26], q[0], q[1] + 1, { align: 'center' })
    })
    etiquetasPorGrupo([
      ...pisos.map((f) => { const pts = f.pontos.map((p) => P(p[0], p[1])); const c = centroide(pts); return { g: f.g, ponto: [c[0] + 12, c[1] + 8] as P2, tamanho: areaPoligono(pts) } }),
      ...trechos.map((t) => {
        // Fora do meio da parede, onde fica a indicação da vista.
        const mid = naPlanta(t.w, t.u0 + (t.u1 - t.u0) * 0.3), n = dirPapel(t.w.normal), c = P(mid[0], mid[1])
        return { g: t.f.g, ponto: [c[0] + n[0] * 4.5, c[1] + n[1] * 4.5] as P2, tamanho: t.u1 - t.u0 }
      }),
    ])

    // ————— Planta de forro —————
    novaPaisagem({ titulo: 'Planta de forro', escala: `1:${esc}` })
    secoes.push({ titulo: 'Planta de forro', pagina: doc.getNumberOfPages() })
    tituloDesenho(AREA.x + 4, AREA.y + 7, 'PLANTA DE FORRO · vista refletida', esc)
    const tetos = [...a.tetos].sort((p, q) => Math.max(...q.pontos.map((x) => x[2])) - Math.max(...p.pontos.map((x) => x[2])))
    for (const f of tetos) {
      const c = corDo(f.g)
      doc.setFillColor(...(especDo(f.g) ? clarear(c, 0.45) : c)); linhaFina(especDo(f.g) ? escurecer(c, 0.2) : LINHA, 0.2)
      poligono(f.pontos.map((p) => P(p[0], p[1])), 'FD')
    }
    for (const t of trechos) {
      const p0 = naPlanta(t.w, t.u0), p1 = naPlanta(t.w, t.u1)
      const A = P(p0[0], p0[1]), B = P(p1[0], p1[1])
      doc.setDrawColor(...TINTA); doc.setLineWidth(0.5); doc.line(A[0], A[1], B[0], B[1])
    }
    const xs = [a.min[0], a.max[0], ...tetos.flatMap((f) => [Math.min(...f.pontos.map((p) => p[0])), Math.max(...f.pontos.map((p) => p[0]))])]
    const ys = [a.min[1], a.max[1], ...tetos.flatMap((f) => [Math.min(...f.pontos.map((p) => p[1])), Math.max(...f.pontos.map((p) => p[1]))])]
    cadeia(P(a.min[0], a.max[1]), [1, 0], k, xs.map((x) => x - a.min[0]), [0, -1])
    cadeia(P(a.min[0], a.min[1]), [0, -1], k, ys.map((v) => v - a.min[1]), [-1, 0])
    // Altura de cada forro em relação ao piso: junto da etiqueta nos acústicos, no canto nos demais.
    const alturaForro = (f: FacePlana) => `h = ${m(Math.min(...f.pontos.map((p) => p[2])) - a.min[2])} m`
    const rotulados = new Set<string>()
    for (const f of [...tetos].reverse()) {
      if (especDo(f.g) || rotulados.has(f.g)) continue
      rotulados.add(f.g)
      const pts = f.pontos.map((p) => P(p[0], p[1]))
      fonte(6.5, false, SUAVE)
      doc.text(alturaForro(f), Math.min(...pts.map((p) => p[0])) + 2, Math.min(...pts.map((p) => p[1])) + 3.5, { baseline: 'middle' })
    }
    const marcadas = etiquetasPorGrupo(tetos.map((f) => { const pts = f.pontos.map((p) => P(p[0], p[1])); const c = centroide(pts); return { g: f.g, ponto: c, tamanho: areaPoligono(pts), face: f } }))
    for (const c of marcadas) { fonte(6.5, false, TINTA); doc.text(alturaForro(c.face!), c.ponto[0], c.ponto[1] + 5.5, { align: 'center' }) }
    const suspensos = espec.filter((e) => e.pecas.length)
    if (suspensos.length) {
      fonte(7, false, SUAVE)
      doc.text(doc.splitTextToSize(`Nuvens e baffles (${suspensos.map((e) => e.codigo).join(', ')}) não fazem parte do modelo 3D: veja as peças e as medidas no quadro de especificações.`, AREA.w - 10), AREA.x + 4, AREA.y + AREA.h - 6)
    }

    // ————— Vistas internas: duas por folha, na mesma escala —————
    if (!a.paredes.length) return
    const slot = { w: AREA.w - 12, h: (AREA.h - 14) / 2 }
    const escV = Math.max(...a.paredes.map((w) => escalaQueCabe(w.u[1], w.z[1] - w.z[0], slot.w - 40, slot.h - 34)))
    const kv = 1000 / escV
    a.paredes.forEach((w, i) => {
      if (i % 2 === 0) {
        novaPaisagem({ titulo: 'Vistas internas', escala: `1:${escV}` })
        if (i === 0) secoes.push({ titulo: 'Vistas internas', pagina: doc.getNumberOfPages() })
      }
      const sy = AREA.y + 6 + (i % 2) * (slot.h + 6)
      const L = w.u[1], H = w.z[1] - w.z[0]
      const ox2 = AREA.x + 6 + (slot.w - L * kv) / 2, base = sy + 12 + (slot.h - 30 + H * kv) / 2
      const V = (u: number, z: number): P2 => [ox2 + u * kv, base - (z - w.z[0]) * kv]
      tituloDesenho(AREA.x + 4, sy + 1, `VISTA ${LETRAS[i % 26]}`, escV)
      const ordem = (f: FacePlana) => { const c = superficieDo(f.g)?.categoria; return !c || CATEGORIAS[c].base ? 0 : c === 'esquadria' ? 2 : 1 }
      const faces = [...w.faces].sort((p, q) => ordem(p) - ordem(q))
      const cand: { g: string; ponto: P2; tamanho: number }[] = []
      for (const f of faces) {
        const pts = f.pontos.map((p) => { const [u, z] = naVista(w, p); return V(u, z) })
        const c = corDo(f.g)
        doc.setFillColor(...(especDo(f.g) ? clarear(c, 0.4) : c)); linhaFina(especDo(f.g) ? escurecer(c, 0.25) : SUAVE, 0.18)
        poligono(pts, 'FD')
        cand.push({ g: f.g, ponto: centroide(pts), tamanho: areaPoligono(pts) })
      }
      // Linhas de piso e de forro.
      linhaFina(TINTA, 0.45)
      doc.line(V(0, w.z[0])[0] - 3, V(0, w.z[0])[1], V(L, w.z[0])[0] + 3, V(L, w.z[0])[1])
      const us = w.faces.flatMap((f) => { const v = f.pontos.map((p) => naVista(w, p)[0]); return [Math.min(...v), Math.max(...v)] })
      const zs = w.faces.flatMap((f) => { const v = f.pontos.map((p) => p[2] - w.z[0]); return [Math.min(...v), Math.max(...v)] })
      cadeia(V(0, w.z[0]), [1, 0], kv, us, [0, 1], 6)
      cadeia(V(L, w.z[0]), [0, -1], kv, zs, [1, 0], 6)
      etiquetasPorGrupo(cand)
    })
  }

  // ————— Capa —————
  const ultimaFolha = () => doc.getNumberOfPages()
  y = 40
  doc.setFillColor(...DESTAQUE); doc.rect(0, 0, 210, 6, 'F')
  fonte(9, true, DESTAQUE); doc.text('MEMORIAL DE ESPECIFICAÇÃO ACÚSTICA', MARGEM, y)
  y += 12
  fonte(24, true)
  const tituloCapa = doc.splitTextToSize(projeto.nome, LARG_RETRATO) as string[]
  doc.text(tituloCapa, MARGEM, y)
  y += tituloCapa.length * 10 + 6
  const avEspec = avaliar(cenario, catalogo)
  const identificacao: [string, string][] = [
    ['Projeto', projeto.nome],
    ['Cenário especificado', cenario.nome],
    ['Projetista', d.projetista.nome || 'Não informado no cadastro'],
    ['Cadastro profissional', d.projetista.registro || 'Não informado no cadastro'],
    ...(d.projetista.empresa ? [['Empresa', d.projetista.empresa] as [string, string]] : []),
    ['Data de emissão', dataTexto],
    ['Critério', avEspec.meta.nome],
    ['Resultado do cenário', NOME_SITUACAO[avEspec.situacao]],
  ]
  for (const [r, v] of identificacao) {
    fonte(8, false, SUAVE); doc.text(r.toUpperCase(), MARGEM, y)
    fonte(11, true); const l = doc.splitTextToSize(v, LARG_RETRATO - 52) as string[]; doc.text(l, MARGEM + 52, y)
    y += Math.max(1, l.length) * 5 + 3
    linhaFina(); doc.line(MARGEM, y - 3.5, 210 - MARGEM, y - 3.5)
  }
  y += 6
  const ySumario = y
  if (!projeto.modelo || !Object.keys(cenario.grupos ?? {}).length) {
    y = 297 - 40
    paragrafo('Este cenário não tem um modelo 3D importado ligado às superfícies, por isso o memorial não traz plantas nem vistas. Importe o modelo na etapa Ambiente para incluí-las.', 8.5, SUAVE)
  }

  // ————— Desenhos —————
  if (projeto.modelo && Object.keys(cenario.grupos ?? {}).length) desenharPlantas(analisarModelo(projeto.modelo))

  // ————— Quadro de especificações —————
  secao('Quadro de especificações')
  paragrafo('Só entram os materiais acústicos do cenário especificado. Materiais comuns, assentos e público ficam de fora. As quantidades de superfícies são as áreas efetivas, já descontados os itens aplicados sobre elas.', 8.5, SUAVE)
  if (!espec.length) paragrafo('O cenário não tem materiais acústicos especificados.')
  else tabela(
    [{ titulo: 'Código', largura: 15 }, { titulo: 'Imagem', largura: 26 }, { titulo: 'Descrição do material', largura: 100 }, { titulo: 'Quantitativo', largura: 33, direita: true }],
    espec.map((e) => {
      const mat = e.material
      const linhas = [
        mat.nome,
        `Categoria: ${mat.tipo.replace(/^ACÚSTICO - /, '').toLowerCase()}${mat.nrc !== undefined ? ` · NRC ${fmt(mat.nrc)}${mat.nrcEstimado ? ' (calculado)' : ''}` : ''}`,
        ...(mat.descricao ? [mat.descricao] : []),
        `α por banda (125 a 4000 Hz): ${mat.alfa.map((x) => fmt(x)).join(' · ')}${mat.unidade ? ' m²/peça' : ''}`,
        `Aplicação: ${e.aplicacao.join(', ')}`,
        ...e.pecas.map((p) => `Peças: ${p}`),
      ]
      return ['', '', linhas.join('\n'), { t: quantidadeTexto(e), negrito: true }]
    }),
    7.5, 24,
    (li, x, yy) => {
      const e = espec[li]
      etiqueta(x + 7, yy + 4.5, e)
      const img = d.imagens[e.material.id]
      const k = LARG_RETRATO / 174
      if (img) {
        try { doc.addImage(img, 'JPEG', x + 15 * k + 1.5, yy + 1.5, 26 * k - 3, 26 * k - 3) } catch { /* imagem inválida: a célula fica vazia */ }
      } else {
        doc.setFillColor(...clarear(hex(cores.get(e.material.id) ?? '#999999'), 0.6))
        doc.rect(x + 15 * k + 1.5, yy + 1.5, 26 * k - 3, 26 * k - 3, 'F')
        fonte(6, false, SUAVE); doc.text('sem imagem', x + 15 * k + 13 * k, yy + 13 * k, { align: 'center' })
      }
    },
  )

  // ————— Resultados —————
  secao('Resultados dos cenários')
  for (const c of projeto.cenarios) {
    const av = avaliar(c, catalogo)
    subtitulo(`${c.nome}${c.id === cenario.id ? ' (especificado)' : ''}: ${NOME_SITUACAO[av.situacao].toLowerCase()}`)
    paragrafo(`${av.meta.nome} · Volume (V) ${m(c.volume)} m³${av.tipo === 'tempo' ? ` · ${av.resultado.formula === 'eyring' ? 'Eyring' : 'Sabine'}, Coeficiente de absorção médio (ᾱ) ${fmt(av.resultado.alfaMedioSala)}` : ''}`, 8.5, SUAVE)
    tabelaResultado(av)
  }

  function tabelaResultado(av: Avaliacao) {
    const cols: Coluna[] = [{ titulo: '', largura: 58 }, ...BANDAS.map((b) => ({ titulo: `${b} Hz`, largura: 19, direita: true }))]
    const VERDE: Cor = [40, 120, 70], VERMELHO: Cor = [190, 50, 40]
    if (av.tipo === 'absorcao') {
      tabela(cols, [
        ['A/V com 100% de ocupação (m²/m³)', ...av.av.map((v, i) => ({ t: fmt(v, 3), cor: av.bandas[i] === 'ok' ? (i >= 1 && i <= 4 ? VERDE : SUAVE) : VERMELHO, negrito: true }))],
        ['A/V mínimo (m²/m³)', ...BANDAS.map((_, i) => (i >= 1 && i <= 4 ? fmt(av.meta.avMinimo, 3) : '—'))],
      ])
      return
    }
    const r = av.resultado
    tabela(cols, [
      ...r.estados.map((e) => [`Tempo de reverberação (T) ${NOME_ESTADO[e]} (s)`, ...r.tempo[e].map((t, i) => ({ t: fmt(t), cor: av.bandas[e][i] === 'ok' ? VERDE : VERMELHO, negrito: true }))]),
      ['Mínimo (s)', ...av.meta.inferior.map((v) => fmt(v))],
      ['Máximo (s)', ...av.meta.superior.map((v) => fmt(v))],
    ])
  }

  // ————— Memória de cálculo —————
  secao('Memória de cálculo')
  const r = avEspec.resultado
  paragrafo(`Cenário ${cenario.nome}. Na memória de cálculo entram todas as superfícies e a ocupação, porque todas absorvem som e mudam o resultado, mesmo as que não fazem parte do quadro de especificações.`, 8.5, SUAVE)
  subtitulo('1. Dados do ambiente')
  tabela([{ titulo: 'Grandeza', largura: 90 }, { titulo: 'Valor', largura: 84 }], [
    ['Volume (V)', `${m(cenario.volume)} m³`],
    ['Área total das superfícies e itens (S)', `${m(r.areaTotal)} m²`],
    ['Pé-direito (h)', `${m(cenario.peDireito)} m`],
    ['Umidade relativa do ar (UR)', cenario.umidade ? `${cenario.umidade}%` : 'desconsiderada (sem absorção do ar)'],
    ['Ocupações avaliadas', r.estados.map((e) => NOME_ESTADO[e]).join(', ')],
  ])

  subtitulo('2. Critério de projeto')
  const crit = cenario.criterio
  if (crit.norma === 'A' && avEspec.tipo === 'tempo') {
    const fat: Record<string, [number, number]> = { A1: [0.45, 0.07], A2: [0.37, -0.14], A3: [0.32, -0.17], A4: [0.26, -0.14], A5: [0.75, -1] }
    const [a1, b1] = fat[crit.grupo]
    equacao(`Talvo = ${fmt(a1)} · lg V ${b1 < 0 ? '−' : '+'} ${fmt(Math.abs(b1))}${crit.grupo === 'A5' ? ' (no máximo 2,00 s)' : ''}`, [
      'Tempo de reverberação alvo (Talvo), em s, da DIN 18041:2016 para o grupo ' + crit.grupo + '.',
      'Volume (V) do ambiente, em m³; lg é o logaritmo na base 10.',
    ], `Talvo = ${fmt(a1)} · lg ${m(cenario.volume)} ${b1 < 0 ? '−' : '+'} ${fmt(Math.abs(b1))} = ${fmt(avEspec.meta.t)} s`)
  } else if (crit.norma === 'NBR' && avEspec.tipo === 'tempo') {
    const [a1, b1, c1] = CURVAS_NBR[crit.curva].coef
    equacao('Tót = a + b · lg V + c · (lg V)²', [
      `Tempo de reverberação ótimo (Tót), em s, a 500 Hz, pela curva "${CURVAS_NBR[crit.curva].usos}" da NBR 12179:1992.`,
      `a, b e c: coeficientes da curva (a = ${fmt(a1, 4)}, b = ${fmt(b1, 4)}, c = ${fmt(c1, 4)}).`,
      'Volume (V) do ambiente, em m³; lg é o logaritmo na base 10.',
    ], `Tót = ${fmt(avEspec.meta.t)} s, com as margens por banda da DIN 18041:2016`)
  } else if (crit.norma === 'B' && avEspec.tipo === 'absorcao') {
    const g = GRUPOS_B[crit.grupo]
    if (cenario.peDireito <= 2.5) paragrafo(`Com Pé-direito (h) até 2,50 m, a DIN 18041:2016 fixa a Área de absorção por volume mínima (A/V) do grupo ${crit.grupo} em ${fmt(g.minimoAte2_5m)} m²/m³.`)
    else equacao('A/V mín = 1 / (c + 4,69 · lg h)', [
      'Área de absorção por volume mínima (A/V mín), em m²/m³, da DIN 18041:2016 para o grupo ' + crit.grupo + '.',
      `c: constante do grupo (${fmt(g.constante)}).`,
      'Pé-direito (h) do ambiente, em m; lg é o logaritmo na base 10.',
    ], `A/V mín = 1 / (${fmt(g.constante)} + 4,69 · lg ${m(cenario.peDireito)}) = ${fmt(avEspec.meta.avMinimo, 3)} m²/m³`)
    paragrafo('O grupo B avalia as bandas de 250 a 2000 Hz com 100% de ocupação.', 8.5, SUAVE)
  }
  if (avEspec.tipo === 'tempo') {
    tabela([{ titulo: 'Margens por banda', largura: 46 }, ...BANDAS.map((b) => ({ titulo: `${b} Hz`, largura: 21, direita: true }))], [
      ['Fator máximo', ...TOLERANCIA_SUPERIOR.map((f) => fmt(f))],
      ['Fator mínimo', ...TOLERANCIA_INFERIOR.map((f) => fmt(f))],
      ['Máximo (s)', ...avEspec.meta.superior.map((v) => fmt(v))],
      ['Mínimo (s)', ...avEspec.meta.inferior.map((v) => fmt(v))],
    ])
  }

  subtitulo('3. Absorção das superfícies e dos elementos')
  equacao('A = S · α', [
    'Área de absorção sonora equivalente (A), em m², de cada superfície ou elemento, por banda.',
    'Área (S) da superfície, em m², já descontados os itens aplicados sobre ela.',
    'Coeficiente de absorção sonora (α) do material, por banda. Nos materiais por peça, a absorção vem em m² por peça e é multiplicada pela quantidade.',
  ])
  const colBandas = BANDAS.map((b) => ({ titulo: `${b}`, largura: 13, direita: true }))
  const fixas = [
    ...cenario.superficies.map((s) => ({ nome: s.nome, mat: catalogo.get(s.material), q: areaEfetiva(cenario, s), un: 'm²' })),
    ...cenario.itens.filter((it) => it.tipo === 'suspenso').map((it) => { const mat = catalogo.get(it.material); return { nome: it.nome, mat, q: it.quantidade, un: mat.unidade ? 'un.' : 'm²' } }),
  ]
  tabela([{ titulo: 'Superfície ou elemento', largura: 40 }, { titulo: 'Material', largura: 42 }, { titulo: 'S ou qtd.', largura: 16, direita: true }, ...colBandas], fixas.map((f) => [f.nome, f.mat.nome, `${f.un === 'un.' ? f.q : m(f.q)} ${f.un}`, ...f.mat.alfa.map((x) => fmt(x))]), 6.8)
  paragrafo('Acima, o Coeficiente de absorção sonora (α) de cada banda. Abaixo, a Área de absorção sonora equivalente (A) resultante, em m².', 8, SUAVE)
  const somaFixa = BANDAS.map((_, i) => fixas.reduce((s, f) => s + f.q * f.mat.alfa[i], 0))
  tabela([{ titulo: 'Superfície ou elemento', largura: 82 }, { titulo: 'S ou qtd.', largura: 16, direita: true }, ...colBandas], [
    ...fixas.map((f) => [f.nome, `${f.un === 'un.' ? f.q : m(f.q)} ${f.un}`, ...f.mat.alfa.map((x) => m(f.q * x))]),
    [{ t: 'Soma (A fixa)', negrito: true }, '', ...somaFixa.map((v) => ({ t: m(v), negrito: true }))],
  ], 6.8)

  const ocupacao = cenario.itens.filter((it) => it.tipo !== 'suspenso')
  if (ocupacao.length) {
    subtitulo('4. Absorção da ocupação')
    paragrafo('Assentos: A = n · [(1 − x) · α vazio + x · α ocupado]. Público: A = n · x · α. A fração ocupada (x) vale 0, 0,5 ou 1 nas ocupações de 0%, 50% e 100%, e n é a quantidade.', 8.5)
    tabela([{ titulo: 'Item · ocupação', largura: 82 }, { titulo: 'Qtd.', largura: 16, direita: true }, ...colBandas], ocupacao.flatMap((it) => r.estados.map((e) => {
      const x = FRACAO_OCUPADA[e]
      const v = catalogo.get(it.material).alfa, o = catalogo.get(it.materialOcupado ?? it.material).alfa
      const a = BANDAS.map((_, i) => (it.tipo === 'assento' ? it.quantidade * ((1 - x) * v[i] + x * o[i]) : it.quantidade * x * v[i]))
      return [`${it.nome} · ${NOME_ESTADO[e]}`, `${it.quantidade}`, ...a.map((q) => m(q))]
    })), 6.8)
  }

  subtitulo(`${ocupacao.length ? 5 : 4}. Tempo de reverberação`)
  const ar = ABSORCAO_AR[cenario.umidade].map((x) => 4 * x * cenario.volume)
  equacao('T = 0,161 · V / (A + 4mV)      (Sabine)', [
    'Tempo de reverberação (T), em s, por banda.',
    'Volume (V) do ambiente, em m³; 0,161 é a constante em s/m.',
    'Área de absorção sonora equivalente (A) total da sala, em m²: superfícies, elementos e ocupação.',
    `Absorção do ar (4mV), em m²: m é o coeficiente de atenuação do ar para UR ${cenario.umidade ? `${cenario.umidade}%` : 'desconsiderada (m = 0)'}.`,
  ])
  equacao('T = 0,161 · V / (−S · ln(1 − ᾱ) + 4mV)      (Eyring)', [
    'Área total (S) das superfícies e itens, em m².',
    'Coeficiente de absorção médio (ᾱ) da banda: ᾱ = A / S.',
    'Os demais termos são os mesmos da fórmula de Sabine.',
  ])
  paragrafo(`Fórmula usada: ${r.formula === 'eyring' ? 'Eyring' : 'Sabine'}. O Coeficiente de absorção médio (ᾱ) da sala, na média das bandas, é ${fmt(r.alfaMedioSala)} na ocupação de ${NOME_ESTADO[r.estadoAlfaMedio]}, ${r.alfaMedioSala > 0.3 ? 'acima' : 'abaixo'} de 0,30. Acima de 0,30 a sala é absorvente e o cálculo usa Eyring; até 0,30 usa Sabine.`, 8.5)
  for (const e of r.estados) {
    const pe = r.porEstado[e]
    garantir(40)
    fonte(9, true); doc.text(`Ocupação ${NOME_ESTADO[e]}`, MARGEM, y); y += 4
    tabela([{ titulo: '', largura: 46 }, ...BANDAS.map((b) => ({ titulo: `${b} Hz`, largura: 21, direita: true }))], [
      ['Área de absorção (A), m²', ...pe.absorcao.map((v) => m(v))],
      ['Absorção do ar (4mV), m²', ...ar.map((v) => m(v))],
      ['Coef. de absorção médio (ᾱ)', ...pe.alfa.map((v) => fmt(v, 3))],
      [{ t: `T Sabine (s)${r.formula === 'sabine' ? ' · usado' : ''}`, negrito: r.formula === 'sabine' }, ...pe.sabine.map((v) => ({ t: fmt(v), negrito: r.formula === 'sabine' }))],
      [{ t: `T Eyring (s)${r.formula === 'eyring' ? ' · usado' : ''}`, negrito: r.formula === 'eyring' }, ...pe.eyring.map((v) => ({ t: fmt(v), negrito: r.formula === 'eyring' }))],
    ], 7)
  }
  const e500 = r.estados[r.estados.length - 1]
  const A500 = r.porEstado[e500].absorcao[2]
  if (r.formula === 'sabine') paragrafo(`Exemplo, 500 Hz com ${NOME_ESTADO[e500]} de ocupação: T = 0,161 · ${m(cenario.volume)} / (${m(A500)} + ${m(ar[2])}) = ${fmt(r.porEstado[e500].sabine[2])} s.`, 8.5, SUAVE)
  else paragrafo(`Exemplo, 500 Hz com ${NOME_ESTADO[e500]} de ocupação: ᾱ = ${m(A500)} / ${m(r.areaTotal)} = ${fmt(r.porEstado[e500].alfa[2], 3)}; T = 0,161 · ${m(cenario.volume)} / (−${m(r.areaTotal)} · ln(1 − ${fmt(r.porEstado[e500].alfa[2], 3)}) + ${m(ar[2])}) = ${fmt(r.porEstado[e500].eyring[2])} s.`, 8.5, SUAVE)
  if (avEspec.tipo === 'absorcao') paragrafo(`No grupo B, a verificação é a Área de absorção por volume (A/V) com 100% de ocupação: A/V = A / V, comparada ao mínimo de ${fmt(avEspec.meta.avMinimo, 3)} m²/m³ nas bandas de 250 a 2000 Hz. O tempo de reverberação acima é só informativo.`, 8.5)

  // ————— Sumário na capa e numeração —————
  doc.setPage(1)
  y = ySumario
  fonte(8, false, SUAVE); doc.text('SUMÁRIO', MARGEM, y); y += 6
  for (const s of secoes) {
    fonte(10, false); doc.text(s.titulo, MARGEM, y)
    doc.text(`folha ${s.pagina}`, 210 - MARGEM, y, { align: 'right' })
    linhaFina(LINHA, 0.1); doc.setLineDashPattern([0.5, 1], 0)
    doc.line(MARGEM + doc.getTextWidth(s.titulo) + 2, y - 0.8, 210 - MARGEM - 14, y - 0.8)
    doc.setLineDashPattern([], 0)
    y += 6
  }
  const total = ultimaFolha()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    fonte(7.5, false, SUAVE)
    if (folhasDesenho.includes(p)) doc.text(`Folha ${p} de ${total}`, 289 - 2.5, 199.5, { align: 'right' })
    else {
      doc.text(`Folha ${p} de ${total}`, 210 - MARGEM, 297 - 10, { align: 'right' })
      doc.text([d.projetista.nome, d.projetista.registro].filter(Boolean).join(' · ') + ` · emitido em ${dataTexto}`, MARGEM, 297 - 10)
    }
  }
  return doc
}
