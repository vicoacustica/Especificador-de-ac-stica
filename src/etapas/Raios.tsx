import { useMemo, useRef, useState, type PointerEvent as EventoPonteiro } from 'react'
import { novoId } from '../dados/exemplo'
import { paraSuperficie, type Catalogo } from '../motor/materiais'
import { BANDAS, type Cenario, type ModeloProjeto, type TracadoRaios, type VistaRaios } from '../motor/tipos'
import type { Ponto } from '../importacao/modelo'
import { caixaPadrao, montarCena, posicoesPadrao, segmentosDaVista } from '../raios/cena'
import { PATOLOGIAS, paresParalelos, patologiasDa, type Patologia } from '../raios/patologias'
import { dist, leque, NOME_VISTA, planoDa, projetar, reflexoes, voltar, type P2, type Reflexao } from '../raios/motor'
import { Numero, Segmentado, SeletorMaterial } from '../ui/campos'
import { fmt } from '../ui/formato'
import { Icone } from '../ui/Icone'

/** Cores por ordem de reflexão; o som direto usa a cor do texto. */
// O som direto e os elementos desenhados usam a cor do texto, que muda no modo escuro.
const COR_ORDEM = ['currentColor', '#e0523e', '#3d7ea6', '#2f9c8f', '#c9932b', '#8a5aa8', '#7a6a58']
const COR_ELEMENTO = 'currentColor'
const MATERIAL_ELEMENTO = 'painel-mdf-padrao'
const VISTAS: VistaRaios[] = ['planta', 'longitudinal']
const ATRASO_MAX = 200

type Arrasto =
  | { tipo: 'fonte' | 'receptor' }
  | { tipo: 'desenho'; a: P2; b: P2 }
  | { tipo: 'ponta'; id: string; ponta: 'a' | 'b' }
  | { tipo: 'borracha' }

interface Props {
  cenario: Cenario
  catalogo: Catalogo
  modelo?: ModeloProjeto
  mudar: (f: (c: Cenario) => void) => void
}

const passo = (v: number, p = 0.05) => +(Math.round(v / p) * p).toFixed(2)

/**
 * Traçado de raios em planta baixa e corte longitudinal: leque de raios a partir da fonte e reflexões especulares
 * até o receptor, com atraso e nível em relação ao som direto. O usuário pode desenhar elementos refletores.
 */
export function EtapaRaios({ cenario, catalogo, modelo, mudar }: Props) {
  const cena = useMemo(() => montarCena(cenario, catalogo, modelo), [cenario, catalogo, modelo])
  const salvo: TracadoRaios = cenario.raios ?? { ...posicoesPadrao(cena), elementos: [] }
  const [rascunho, setRascunho] = useState<TracadoRaios | null>(null)
  const raios = rascunho ?? salvo
  const [vista, setVista] = useState<VistaRaios>('planta')
  const [banda, setBanda] = useState(3)
  const [ordem, setOrdem] = useState(2)
  const [quantidade, setQuantidade] = useState(90)
  const [ordemLeque, setOrdemLeque] = useState(3)
  const [ferramenta, setFerramenta] = useState<'mover' | 'desenhar' | 'apagar'>('mover')
  const materiais = useMemo(() => catalogo.todos.filter(paraSuperficie), [catalogo])
  const [materialNovo, setMaterialNovo] = useState(() => (materiais.some((m) => m.id === MATERIAL_ELEMENTO) ? MATERIAL_ELEMENTO : materiais[0]?.id ?? ''))
  const [selecionada, setSelecionada] = useState<number | null>(null)
  const [elementoSel, setElementoSel] = useState<string | null>(null)
  const [arrasto, setArrasto] = useState<Arrasto | null>(null)
  const svg = useRef<SVGSVGElement>(null)

  const salvar = (r: TracadoRaios) => mudar((c) => { c.raios = structuredClone(r) })
  const plano = planoDa(vista, raios.fonte, cena.eixo)
  const segs = useMemo(() => segmentosDaVista(cena, plano, vista, raios, catalogo, COR_ELEMENTO),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cena, vista, catalogo, raios.elementos, plano.d, plano.n[0], plano.n[1], plano.n[2]])
  const fonte = projetar(plano, raios.fonte), receptor = projetar(plano, raios.receptor)

  // Enquadramento da vista: limites das superfícies, da fonte e do receptor.
  const quadro = useMemo(() => {
    const pts: P2[] = [...segs.flatMap((s) => [s.a, s.b]), fonte, receptor]
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
    const m = Math.max(x1 - x0, y1 - y0) * 0.08 + 0.4
    return { x0: x0 - m, y0: y0 - m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m }
    // Recalcula só quando a geometria muda, para a vista não “pular” enquanto a fonte é arrastada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segs])
  const k = Math.max(quadro.w, quadro.h) / 60
  const alcance = Math.max(quadro.w, quadro.h) * 3

  const tracos = useMemo(() => (quantidade ? leque(segs, fonte, quantidade, ordemLeque, banda, alcance) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segs, fonte[0], fonte[1], quantidade, ordemLeque, banda, alcance])
  const resultado = useMemo(() => reflexoes(segs, fonte, receptor, ordem, banda, ATRASO_MAX),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segs, fonte[0], fonte[1], receptor[0], receptor[1], ordem, banda])
  const lista = resultado.lista
  const sel = selecionada !== null ? lista[selecionada] : undefined

  function pontoDo(e: EventoPonteiro): P2 {
    const s = svg.current!
    const pt = s.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const q = pt.matrixTransform(s.getScreenCTM()!.inverse())
    return [q.x, -q.y]
  }
  /** Fonte e receptor ficam dentro da caixa envolvente da sala. */
  function prender(p: Ponto): Ponto {
    return [0, 1, 2].map((i) => passo(Math.min(cena.max[i] - 0.1, Math.max(cena.min[i] + 0.1, p[i])))) as Ponto
  }

  function aoApertar(e: EventoPonteiro<SVGSVGElement>) {
    const p = pontoDo(e)
    const perto = 0.9 * k * 2
    let a: Arrasto | null = null
    if (ferramenta === 'desenhar') {
      const q: P2 = [passo(p[0]), passo(p[1])]
      a = { tipo: 'desenho', a: q, b: q }
    } else if (ferramenta === 'apagar') {
      // A borracha apaga o elemento tocado e os que forem tocados enquanto o ponteiro é arrastado.
      e.currentTarget.setPointerCapture(e.pointerId)
      setArrasto({ tipo: 'borracha' })
      setRascunho(apagarPerto(structuredClone(raios), p, perto))
      return
    } else if (dist(p, fonte) < perto) a = { tipo: 'fonte' }
    else if (dist(p, receptor) < perto) a = { tipo: 'receptor' }
    else {
      for (const el of raios.elementos.filter((x) => x.vista === vista)) {
        if (dist(p, el.a) < perto) { a = { tipo: 'ponta', id: el.id, ponta: 'a' }; break }
        if (dist(p, el.b) < perto) { a = { tipo: 'ponta', id: el.id, ponta: 'b' }; break }
      }
      if (!a) {
        const el = raios.elementos.find((x) => x.vista === vista && distSeg(p, x.a, x.b) < perto)
        setElementoSel(el?.id ?? null)
      }
    }
    if (!a) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setArrasto(a)
    setRascunho(structuredClone(raios))
  }
  function aoMover(e: EventoPonteiro<SVGSVGElement>) {
    if (!arrasto || !rascunho) return
    const p = pontoDo(e)
    const q: P2 = [passo(p[0]), passo(p[1])]
    if (arrasto.tipo === 'desenho') { setArrasto({ ...arrasto, b: q }); return }
    if (arrasto.tipo === 'borracha') { setRascunho(apagarPerto(structuredClone(rascunho), p, 0.9 * k * 2)); return }
    const r = structuredClone(rascunho)
    if (arrasto.tipo === 'fonte') r.fonte = prender(voltar(plano, p, r.fonte))
    else if (arrasto.tipo === 'receptor') r.receptor = prender(voltar(plano, p, r.receptor))
    else if (arrasto.tipo === 'ponta') { const { id, ponta } = arrasto; const el = r.elementos.find((x) => x.id === id); if (el) el[ponta] = q }
    setRascunho(r)
  }
  function aoSoltar() {
    if (!arrasto || !rascunho) return
    const r = structuredClone(rascunho)
    if (arrasto.tipo === 'desenho' && dist(arrasto.a, arrasto.b) >= 0.2) {
      const id = novoId()
      r.elementos.push({ id, vista, a: arrasto.a, b: arrasto.b, material: materialNovo })
      setElementoSel(id)
    }
    setArrasto(null)
    setRascunho(null)
    setSelecionada(null)
    salvar(r)
  }
  function apagarPerto(r: TracadoRaios, p: P2, perto: number): TracadoRaios {
    r.elementos = r.elementos.filter((x) => x.vista !== vista || distSeg(p, x.a, x.b) >= perto)
    return r
  }
  const mudarRaios = (f: (r: TracadoRaios) => void) => { const r = structuredClone(raios); f(r); salvar(r) }

  const elementosDaVista = raios.elementos.filter((e) => e.vista === vista)
  const outros = raios.elementos.filter((e) => e.vista !== vista && VISTAS.includes(e.vista)).length
  const patologias = lista.map((r) => patologiasDa(r, segs, banda))
  const pares = paresParalelos(segs, banda)
  const emPar = new Set(pares.flatMap((x) => [x.a, x.b]))
  const contagem = (Object.keys(PATOLOGIAS) as Patologia[]).map((t) => ({ t, n: patologias.filter((x) => x.includes(t)).length }))
  const nomeSeg = (i: number) => segs[i]?.nome ?? ''
  const fs = 1.6 * k

  // Linha do corte longitudinal na planta, pela fonte.
  const cortesNaPlanta = vista === 'planta' ? (['longitudinal'] as const).map((v) => {
    const e = cena.eixo
    const L = Math.max(quadro.w, quadro.h)
    return { v, a: [fonte[0] - e[0] * L, fonte[1] - e[1] * L] as P2, b: [fonte[0] + e[0] * L, fonte[1] + e[1] * L] as P2 }
  }) : []

  const desenho = arrasto?.tipo === 'desenho' ? arrasto : null

  return (
    <>
      <h2>Traçado de raios</h2>
      <p className="lead">Veja os principais pontos de reflexão entre a fonte (F) e o receptor (R) em planta baixa e no corte longitudinal. As superfícies refletem com a absorção (α) do material escolhido no cenário, e você pode desenhar elementos novos para testar planos de reflexão.</p>
      {cena.caixa && (
        <div className="raios-caixa">
          <p className="nota">Este cenário não tem um modelo 3D importado. O traçado usa uma sala retangular de referência com o pé-direito do cenário ({fmt(cenario.peDireito)} m) e o α médio das superfícies de piso, paredes e teto.</p>
          <div className="linha">
            <label className="campo">Comprimento (m)
              <Numero valor={(raios.caixa ?? caixaPadrao(cenario)).comprimento} minimo={1} passo={0.1} aoMudar={(v) => mudarRaios((r) => { r.caixa = { ...(r.caixa ?? caixaPadrao(cenario)), comprimento: v } })} />
            </label>
            <label className="campo">Largura (m)
              <Numero valor={(raios.caixa ?? caixaPadrao(cenario)).largura} minimo={1} passo={0.1} aoMudar={(v) => mudarRaios((r) => { r.caixa = { ...(r.caixa ?? caixaPadrao(cenario)), largura: v } })} />
            </label>
          </div>
        </div>
      )}

      <div className="raios-controles">
        <Segmentado rotulo="Vista" valor={vista} aoMudar={(v) => { setVista(v); setSelecionada(null); setElementoSel(null) }} opcoes={VISTAS.map((v) => ({ valor: v, rotulo: NOME_VISTA[v] }))} />
        <div className="linha">
          <label className="campo">Banda de frequência
            <select value={banda} onChange={(e) => setBanda(Number(e.target.value))}>
              {BANDAS.map((b, i) => <option key={b} value={i}>{b} Hz</option>)}
            </select>
          </label>
          <label className="campo">Reflexões até a ordem
            <select value={ordem} onChange={(e) => { setOrdem(Number(e.target.value)); setSelecionada(null) }}>
              {[1, 2, 3].map((o) => <option key={o} value={o}>{o}ª ordem</option>)}
            </select>
          </label>
          <label className="campo">Leque de raios
            <select value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))}>
              <option value={0}>Ocultar</option>
              {[36, 90, 180, 360, 720].map((n) => <option key={n} value={n}>{n} raios</option>)}
            </select>
          </label>
          <label className="campo">Reflexões do leque
            <select value={ordemLeque} onChange={(e) => setOrdemLeque(Number(e.target.value))} disabled={!quantidade}>
              {[1, 2, 3, 4, 5, 6].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="raios-ferramentas">
        <Segmentado rotulo="Ferramenta" valor={ferramenta} aoMudar={setFerramenta} opcoes={[
          { valor: 'mover', rotulo: 'Mover F e R' },
          { valor: 'desenhar', rotulo: 'Desenhar elemento' },
          { valor: 'apagar', rotulo: <><Icone nome="borracha" tamanho={15} />Borracha</> },
        ]} />
        {ferramenta === 'desenhar' && (
          <div className="raios-material">
            <span className="suave">Material do novo elemento</span>
            <SeletorMaterial materiais={materiais} valor={materialNovo} aoMudar={setMaterialNovo} rotulo="Material do novo elemento" />
          </div>
        )}
      </div>

      <div className={`raios-visor ${ferramenta === 'desenhar' ? 'desenhando' : ferramenta === 'apagar' ? 'apagando' : ''}`}>
        <svg ref={svg} viewBox={`${quadro.x0} ${-quadro.y0 - quadro.h} ${quadro.w} ${quadro.h}`} role="img"
          aria-label={`${NOME_VISTA[vista]} com a fonte, o receptor, ${segs.length} superfícies e ${lista.length} reflexões`}
          onPointerDown={aoApertar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}>
          <Grade quadro={quadro} />
          <g className="raios-leque">
            {tracos.map((t, i) => (
              <line key={i} x1={t.a[0]} y1={-t.a[1]} x2={t.b[0]} y2={-t.b[1]} stroke={COR_ORDEM[Math.min(t.ordem, 6)]} strokeOpacity={0.08 + 0.4 * t.energia} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          {cortesNaPlanta.map((c) => (
            <g key={c.v} className="raios-corte">
              <line x1={c.a[0]} y1={-c.a[1]} x2={c.b[0]} y2={-c.b[1]} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {[...emPar].map((i) => (
            <line key={`par${i}`} x1={segs[i].a[0]} y1={-segs[i].a[1]} x2={segs[i].b[0]} y2={-segs[i].b[1]} className="raios-paralela" vectorEffect="non-scaling-stroke" />
          ))}
          {segs.map((s, i) => (
            <line key={i} x1={s.a[0]} y1={-s.a[1]} x2={s.b[0]} y2={-s.b[1]} stroke={s.cor} strokeWidth={s.elemento ? 5 : 4} strokeLinecap="round" vectorEffect="non-scaling-stroke"
              className={s.elemento && s.chave === elementoSel ? 'raios-el-sel' : undefined}>
              <title>{`${s.nome} · α ${fmt(s.alfa[banda])} em ${BANDAS[banda]} Hz`}</title>
            </line>
          ))}
          {/* Reflexões: todas finas, a escolhida em destaque. */}
          {lista.map((r, i) => (
            <polyline key={i} points={r.pontos.map((p) => `${p[0]},${-p[1]}`).join(' ')} fill="none" stroke={COR_ORDEM[r.ordem]}
              strokeOpacity={sel ? (i === selecionada ? 1 : 0.12) : 0.55} strokeWidth={i === selecionada ? 2.6 : 1.2} vectorEffect="non-scaling-stroke"
              strokeDasharray={r.ordem > 1 && i !== selecionada ? '4 3' : undefined} />
          ))}
          <line x1={fonte[0]} y1={-fonte[1]} x2={receptor[0]} y2={-receptor[1]} stroke={COR_ORDEM[0]} strokeWidth={2} vectorEffect="non-scaling-stroke"
            strokeDasharray={resultado.direto.obstruido ? '2 4' : undefined} strokeOpacity={sel ? 0.3 : 0.9} />
          {lista.map((r, i) => (sel && i !== selecionada ? null : r.pontos.slice(1, -1).map((p, j) => (
            <g key={`${i}-${j}`}>
              <circle cx={p[0]} cy={-p[1]} r={0.32 * k} fill={COR_ORDEM[r.ordem]} className="raios-ponto-refl" vectorEffect="non-scaling-stroke" />
              {(r.ordem === 1 || i === selecionada) && <text x={p[0] + 0.5 * k} y={-p[1] - 0.5 * k} style={{ fontSize: fs }} className="raios-num">{i + 1}</text>}
            </g>
          ))))}
          {desenho && <line x1={desenho.a[0]} y1={-desenho.a[1]} x2={desenho.b[0]} y2={-desenho.b[1]} stroke={COR_ELEMENTO} strokeWidth={5} strokeLinecap="round" strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />}
          {elementosDaVista.filter((el) => el.id === elementoSel).flatMap((el) => [el.a, el.b]).map((p, i) => (
            <circle key={i} cx={p[0]} cy={-p[1]} r={0.45 * k} className="raios-ponta" vectorEffect="non-scaling-stroke" />
          ))}
          <g className="raios-fonte">
            <circle cx={fonte[0]} cy={-fonte[1]} r={k} />
            <text x={fonte[0]} y={-fonte[1] + 0.55 * k} style={{ fontSize: fs }}>F</text>
          </g>
          <g className="raios-receptor">
            <circle cx={receptor[0]} cy={-receptor[1]} r={k} vectorEffect="non-scaling-stroke" />
            <text x={receptor[0]} y={-receptor[1] + 0.55 * k} style={{ fontSize: fs }}>R</text>
          </g>
          <Escala quadro={quadro} k={k} />
        </svg>
      </div>
      <p className="nota raios-legenda">
        {COR_ORDEM.slice(0, ordem + 1).map((c, i) => <span key={i}><i style={{ background: c }} />{i === 0 ? 'Som direto' : `${i}ª reflexão`}</span>)}
        {vista === 'planta' ? ' · Planta cortada na altura da fonte; a linha tracejada é o corte longitudinal, que passa pela fonte.' : ` · O corte passa pela fonte; o receptor aparece projetado no plano do corte.`}
        {pares.length > 0 && ' As faixas amarelas marcam superfícies paralelas e refletoras, com risco de eco palpitante.'}
        {ferramenta === 'desenhar' ? ' Arraste no desenho para criar um elemento.' : ferramenta === 'apagar' ? ' Clique em um elemento desenhado, ou passe a borracha sobre vários, para apagá-los.' : ' Arraste F e R para mudar as posições.'}
      </p>

      <div className="raios-posicoes">
        {(['fonte', 'receptor'] as const).map((q) => (
          <fieldset key={q} className="raios-ponto">
            <legend>{q === 'fonte' ? 'Fonte sonora (F)' : 'Receptor (R)'}</legend>
            {(['x', 'y', 'z'] as const).map((eixo, i) => (
              <label key={eixo} className="campo">{eixo === 'z' ? 'Altura (z)' : eixo} em m
                <Numero valor={raios[q][i]} passo={0.1} aoMudar={(v) => mudarRaios((r) => { const p = [...r[q]] as Ponto; p[i] = v; r[q] = prender(p) })} />
              </label>
            ))}
          </fieldset>
        ))}
      </div>

      <h3>Reflexões no receptor</h3>
      <p className="nota">
        Som direto: percurso de {fmt(resultado.direto.percurso)} m, chega em {fmt((resultado.direto.percurso / 343) * 1000, 1)} ms.
        {resultado.direto.obstruido && ' Nesta vista o som direto está obstruído por uma superfície.'}
        {' '}O atraso (Δt) de cada reflexão é a diferença de percurso dividida pela velocidade do som (c = 343 m/s). O nível relativo considera a divergência esférica e a absorção (α) das superfícies em {BANDAS[banda]} Hz.
      </p>
      <Reflectograma lista={lista} patologias={patologias} selecionada={selecionada} selecionar={setSelecionada} />
      <div className="raios-atencao">
        <h4>Reflexões que podem prejudicar a audição</h4>
        <ul>
          {contagem.map(({ t, n }) => (
            <li key={t}>
              <span className={`raios-pato ${t}`}>{PATOLOGIAS[t].sigla}</span>
              <span><b>{PATOLOGIAS[t].nome}</b>{t === 'palpitante' ? ` · ${n} ${n === 1 ? 'reflexão' : 'reflexões'} e ${pares.length} ${pares.length === 1 ? 'par de superfícies paralelas' : 'pares de superfícies paralelas'}` : ` · ${n} ${n === 1 ? 'reflexão' : 'reflexões'}`}<br /><span className="suave">{PATOLOGIAS[t].criterio}</span></span>
            </li>
          ))}
        </ul>
        {pares.length > 0 && (
          <p className="nota">Superfícies paralelas e refletoras em {BANDAS[banda]} Hz: {pares.slice(0, 6).map((x) => `${nomeSeg(x.a)} e ${nomeSeg(x.b)} a ${fmt(x.distancia)} m (repetição a cada ${fmt(x.periodo, 1)} ms)`).join('; ')}{pares.length > 6 ? ` e mais ${pares.length - 6}` : ''}.</p>
        )}
        <p className="nota">Critérios de Haas (1951), Kuttruff (Room Acoustics, 2009), Long (Architectural Acoustics, 2014) e Everest e Pohlmann (Master Handbook of Acoustics, 2015). São indicações de atenção no plano desta vista; a audição real depende também da difusão, da direção de chegada e do ruído de fundo.</p>
      </div>
      {lista.length ? (
        <div className="tabela-rolagem">
          <table className="raios-tabela">
            <thead><tr><th>Nº</th><th>Ordem</th><th>Superfícies refletoras</th><th className="num">Percurso (m)</th><th className="num">Atraso Δt (ms)</th><th className="num">Nível (dB)</th><th>Atenção</th></tr></thead>
            <tbody>
              {lista.map((r, i) => (
                <tr key={i} aria-selected={i === selecionada} onClick={() => setSelecionada(i === selecionada ? null : i)}>
                  <td><span className="raios-bola" style={{ background: COR_ORDEM[r.ordem] }}>{i + 1}</span></td>
                  <td>{r.ordem}ª</td>
                  <td>{r.superficies.map(nomeSeg).join(' → ')}</td>
                  <td className="num">{fmt(r.percurso)}</td>
                  <td className="num"><b>{fmt(r.atraso, 1)}</b></td>
                  <td className="num">{fmt(r.nivel, 1)}</td>
                  <td>{patologias[i].map((t) => <span key={t} className={`raios-pato ${t}`} title={PATOLOGIAS[t].nome}>{PATOLOGIAS[t].sigla}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="nota">Nenhuma reflexão especular chega ao receptor nesta vista com atraso de até {ATRASO_MAX} ms.</p>}
      <p className="nota">A equação do atraso é Δt = (r − r₀) / c, e a do nível relativo é L = 20·log(r₀ / r) + 10·log[Π(1 − α)].<br />
        Legenda: Atraso (Δt) em s; percurso da reflexão (r) e do som direto (r₀) em m; velocidade do som (c) em m/s; nível relativo (L) em dB; coeficiente de absorção (α) de cada superfície em que o raio reflete.</p>

      <h3>Elementos desenhados</h3>
      {!elementosDaVista.length && <p className="nota">Nenhum elemento nesta vista. Escolha “Desenhar elemento” e arraste no desenho para testar um plano de reflexão, como um painel refletor, uma nuvem ou um defletor.</p>}
      <div className="raios-elementos">
        {elementosDaVista.map((el, i) => (
          <div key={el.id} className={`raios-elemento ${el.id === elementoSel ? 'sel' : ''}`} onClick={() => setElementoSel(el.id)}>
            <b>Elemento {i + 1}</b>
            <span className="suave">{fmt(dist(el.a, el.b))} m</span>
            <SeletorMaterial materiais={materiais} valor={el.material} aoMudar={(m) => mudarRaios((r) => { const x = r.elementos.find((y) => y.id === el.id); if (x) x.material = m })} rotulo={`Material do elemento ${i + 1}`} />
            <button type="button" className="btn fantasma pequeno" aria-label={`Excluir elemento ${i + 1}`} onClick={(e) => { e.stopPropagation(); mudarRaios((r) => { r.elementos = r.elementos.filter((y) => y.id !== el.id) }) }}><Icone nome="lixo" tamanho={16} />Excluir</button>
          </div>
        ))}
      </div>
      {outros > 0 && <p className="nota">Há {outros} {outros === 1 ? 'elemento desenhado' : 'elementos desenhados'} em outras vistas.</p>}
      <p className="nota">Cada vista é um corte em 2D: entram as superfícies cortadas pelo plano, e um elemento desenhado vale só na vista em que foi criado, como uma faixa perpendicular ao desenho. Os elementos servem para testar reflexões e não entram no cálculo do tempo de reverberação.</p>
    </>
  )
}

function distSeg(p: P2, a: P2, b: P2) {
  const ex = b[0] - a[0], ey = b[1] - a[1]
  const L2 = ex * ex + ey * ey || 1
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / L2))
  return dist(p, [a[0] + ex * t, a[1] + ey * t])
}

type Quadro = { x0: number; y0: number; w: number; h: number }

function Grade({ quadro }: { quadro: Quadro }) {
  const linhas = []
  for (let x = Math.ceil(quadro.x0); x <= quadro.x0 + quadro.w; x++) linhas.push(<line key={`x${x}`} x1={x} y1={-quadro.y0} x2={x} y2={-quadro.y0 - quadro.h} />)
  for (let y = Math.ceil(quadro.y0); y <= quadro.y0 + quadro.h; y++) linhas.push(<line key={`y${y}`} x1={quadro.x0} y1={-y} x2={quadro.x0 + quadro.w} y2={-y} />)
  return <g className="raios-grade">{linhas}</g>
}

function Escala({ quadro, k }: { quadro: Quadro; k: number }) {
  const L = quadro.w > 12 ? 5 : 1
  const x = quadro.x0 + 1.2 * k, y = -quadro.y0 - 1.2 * k
  return (
    <g className="raios-escala">
      <line x1={x} y1={y} x2={x + L} y2={y} vectorEffect="non-scaling-stroke" />
      <line x1={x} y1={y - 0.4 * k} x2={x} y2={y + 0.4 * k} vectorEffect="non-scaling-stroke" />
      <line x1={x + L} y1={y - 0.4 * k} x2={x + L} y2={y + 0.4 * k} vectorEffect="non-scaling-stroke" />
      <text x={x + L / 2} y={y - 0.7 * k} style={{ fontSize: 1.4 * k }}>{L} m</text>
    </g>
  )
}

/** Reflectograma: cada reflexão é uma barra no tempo de atraso, com a altura do nível em relação ao som direto. */
function Reflectograma({ lista, patologias, selecionada, selecionar }: { lista: Reflexao[]; patologias: Patologia[][]; selecionada: number | null; selecionar: (i: number | null) => void }) {
  const W = 640, H = 190, esq = 44, dir = 12, topo = 14, base = 30
  const tMax = Math.max(100, Math.min(ATRASO_MAX, Math.ceil((Math.max(0, ...lista.map((r) => r.atraso)) + 10) / 20) * 20))
  const dbMin = -30
  const x = (t: number) => esq + (t / tMax) * (W - esq - dir)
  const y = (db: number) => topo + (Math.min(0, Math.max(dbMin, db)) / dbMin) * (H - topo - base)
  const marcasT = Array.from({ length: Math.floor(tMax / 20) + 1 }, (_, i) => i * 20)
  return (
    <svg className="raios-reflectograma" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Reflectograma com ${lista.length} reflexões até ${tMax} ms`}>
      {[0, -10, -20, -30].map((db) => (
        <g key={db} className="eixo">
          <line x1={esq} x2={W - dir} y1={y(db)} y2={y(db)} />
          <text x={esq - 6} y={y(db) + 4} textAnchor="end">{db} dB</text>
        </g>
      ))}
      {marcasT.map((t) => <text key={t} className="eixo" x={x(t)} y={H - base + 16} textAnchor="middle">{t}</text>)}
      <text className="eixo" x={W - dir} y={H - 2} textAnchor="end">Atraso em relação ao som direto (ms)</text>
      {/* Zona de eco: depois de 50 ms e até 10 dB abaixo do som direto. */}
      <rect className="zona-eco" x={x(50)} y={y(0)} width={x(tMax) - x(50)} height={y(-10) - y(0)} />
      <text className="zona-eco-texto" x={x(tMax) - 4} y={y(-10) - 4} textAnchor="end">zona de eco</text>
      {[50, 80].filter((t) => t <= tMax).map((t) => (
        <g key={t} className="limite">
          <line x1={x(t)} x2={x(t)} y1={topo} y2={H - base} />
          <text x={x(t) + 4} y={topo + 10}>{t} ms</text>
        </g>
      ))}
      <line x1={x(0)} x2={x(0)} y1={y(dbMin)} y2={y(0)} stroke={COR_ORDEM[0]} strokeWidth={3} />
      {lista.map((r, i) => (
        <line key={i} x1={x(r.atraso)} x2={x(r.atraso)} y1={y(dbMin)} y2={y(r.nivel)} stroke={COR_ORDEM[r.ordem]} strokeWidth={i === selecionada ? 5 : 3}
          strokeOpacity={selecionada === null || i === selecionada ? 1 : 0.3} className="barra" onClick={() => selecionar(i === selecionada ? null : i)}>
          <title>{`Reflexão ${i + 1}: ${fmt(r.atraso, 1)} ms, ${fmt(r.nivel, 1)} dB${patologias[i].length ? ` · ${patologias[i].map((t) => PATOLOGIAS[t].nome).join(', ')}` : ''}`}</title>
        </line>
      ))}
      {lista.map((r, i) => patologias[i].length ? (
        <text key={`p${i}`} className="marca-pato" x={x(r.atraso)} y={y(r.nivel) - 4} textAnchor="middle">{patologias[i].map((t) => PATOLOGIAS[t].sigla).join('')}</text>
      ) : null)}
    </svg>
  )
}
