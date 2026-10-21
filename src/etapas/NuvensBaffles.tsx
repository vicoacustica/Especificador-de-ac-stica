import { useEffect } from 'react'
import { suspenso, type Catalogo } from '../motor/materiais'
import { areaDaForma, elementoDe, FORMAS, FORMAS_NUVEM, type Cenario, type Elemento, type Forma, type ItemOcupacao, type TipoForma } from '../motor/tipos'
import { novoId } from '../dados/exemplo'
import { Icone } from '../ui/Icone'
import { Numero, Segmentado, SeletorMaterial, Texto } from '../ui/campos'
import { fmt } from '../ui/formato'

const FORMA_PADRAO = { tipo: 'retangulo' as TipoForma, medidas: [1.2, 0.6], quantidade: 10 }
const MEDIDAS_PADRAO: Record<TipoForma, number[]> = { quadrado: [1.2], retangulo: [1.2, 0.6], circulo: [1.2], triangulo: [1.2, 1], trapezio: [1.2, 0.6, 0.6], baffle: [1.2, 0.05, 0.3] }
const formaPadrao = (e: Elemento, quantidade = 10): Forma =>
  e === 'baffle' ? { tipo: 'baffle', medidas: [...MEDIDAS_PADRAO.baffle], quantidade } : { ...FORMA_PADRAO, medidas: [...FORMA_PADRAO.medidas], quantidade }

function DesenhoForma({ tipo }: { tipo: TipoForma }) {
  const d = {
    quadrado: <rect x={4} y={4} width={16} height={16} rx={1} />,
    retangulo: <rect x={2} y={7} width={20} height={10} rx={1} />,
    circulo: <circle cx={12} cy={12} r={8.5} />,
    triangulo: <path d="M12 4 21 20H3z" />,
    trapezio: <path d="M7 6h10l5 12H2z" />,
    baffle: <rect x={9} y={3} width={6} height={18} rx={1} />,
  }[tipo]
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" fillOpacity={0.18} stroke="currentColor" strokeWidth={1.6} aria-hidden="true">{d}</svg>
}

/** Baffle em perspectiva com as três medidas. */
function DesenhoBaffle() {
  return (
    <svg className="desenho-baffle" width={150} height={96} viewBox="0 0 150 96" aria-hidden="true">
      <path d="M20 22 108 22 128 10 40 10Z" fill="currentColor" fillOpacity={0.06} stroke="currentColor" strokeWidth={1.2} />
      <path d="M20 22 108 22 108 70 20 70Z" fill="var(--accent)" fillOpacity={0.18} stroke="currentColor" strokeWidth={1.4} />
      <path d="M108 22 128 10 128 58 108 70Z" fill="currentColor" fillOpacity={0.1} stroke="currentColor" strokeWidth={1.2} />
      <path d="M20 70 108 70 128 58 40 58" fill="none" stroke="var(--accent)" strokeWidth={2} />
      <text x={64} y={86} textAnchor="middle" fontSize={11} fill="currentColor">C</text>
      <text x={124} y={74} fontSize={11} fill="currentColor">L</text>
      <text x={8} y={50} fontSize={11} fill="currentColor">H</text>
    </svg>
  )
}

export function EtapaNuvens({ cenario, catalogo, mudar }: { cenario: Cenario; catalogo: Catalogo; mudar: (f: (c: Cenario) => void) => void }) {
  const porPeca = (it: ItemOcupacao) => catalogo.get(it.material).unidade
  const itens = cenario.itens.filter((it) => it.tipo === 'suspenso')
  const semMedidas = (it: ItemOcupacao) => elementoDe(it) === 'baffle' && !porPeca(it) && it.forma?.tipo !== 'baffle'
  const pendentes = itens.filter(semMedidas).map((it) => it.id).join()

  // Baffles com α de versões anteriores ainda não têm as três medidas: entram com as medidas padrão.
  useEffect(() => {
    if (!pendentes) return
    mudar((c) => {
      for (const it of c.itens) {
        if (it.tipo === 'suspenso' && semMedidas(it)) {
          it.forma = formaPadrao('baffle', it.forma?.quantidade ?? 10)
          it.quantidade = +areaDaForma(it.forma).toFixed(3)
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendentes])

  function alterar(id: string, f: (it: ItemOcupacao) => void) {
    mudar((c) => {
      const it = c.itens.find((x) => x.id === id)!
      f(it)
      if (it.forma) it.quantidade = +areaDaForma(it.forma).toFixed(3)
    })
  }
  // Ao trocar entre material por peça e material por coeficiente (α), a quantidade muda de sentido (peças ou m²).
  function trocarMaterial(id: string, material: string) {
    alterar(id, (x) => {
      const antes = catalogo.get(x.material).unidade, depois = catalogo.get(material).unidade
      x.material = material
      if (antes && !depois) x.forma = formaPadrao(elementoDe(x), Math.max(1, Math.round(x.quantidade)))
      if (!antes && depois) { x.quantidade = x.forma?.quantidade ?? 10; delete x.forma }
    })
  }
  // Baffle com α sempre usa as três medidas; nuvem com α volta ao formato padrão.
  function trocarElemento(id: string, e: Elemento) {
    alterar(id, (x) => {
      const nomePadrao = x.nome === 'Nuvens' || x.nome === 'Baffles'
      x.elemento = e
      if (nomePadrao) x.nome = e === 'baffle' ? 'Baffles' : 'Nuvens'
      if (!catalogo.get(x.material).unidade && (e === 'baffle' || x.forma)) x.forma = formaPadrao(e, x.forma?.quantidade ?? 10)
    })
  }
  function adicionar(elemento: Elemento) {
    mudar((c) => { c.itens.push({ id: novoId(), tipo: 'suspenso', elemento, nome: elemento === 'baffle' ? 'Baffles' : 'Nuvens', quantidade: 10, material: catalogo.porNome('TRISOFT NUVEM CLÁSSICA 1200X1200X50MM (POR UNIDADE)').id }) })
  }

  function camposForma(it: ItemOcupacao, f: Forma) {
    return (
      <div className="linha">
        {FORMAS[f.tipo].medidas.map((rotulo, i) => (
          <label key={`${f.tipo}-${i}`} className="campo">{rotulo} em m
            <Numero minimo={0} valor={f.medidas[i]} aoMudar={(v) => alterar(it.id, (x) => { x.forma!.medidas[i] = v })} />
          </label>
        ))}
        <label className="campo">Quantidade de peças
          <Numero passo={1} minimo={0} valor={f.quantidade} aoMudar={(v) => alterar(it.id, (x) => { x.forma!.quantidade = Math.round(v) })} />
        </label>
        <span className="resultado-forma">Área total <b>{fmt(areaDaForma(f))} m²</b></span>
      </div>
    )
  }

  function medidasSuspenso(it: ItemOcupacao) {
    if (porPeca(it)) {
      return (
        <div className="sup-l2">
          <label className="em">Quantidade de peças <Numero passo={1} minimo={0} valor={it.quantidade} aoMudar={(v) => alterar(it.id, (x) => { x.quantidade = Math.round(v) })} /> un.</label>
          <span className="nota">Este material tem a absorção por peça (m² Sabine por unidade).</span>
        </div>
      )
    }
    const f = it.forma
    if (elementoDe(it) === 'baffle') {
      if (f?.tipo !== 'baffle') return null
      const forma = f
      return (
        <div className="forma">
          <div className="baffle-medidas">
            <DesenhoBaffle />
            {camposForma(it, forma)}
          </div>
          <p className="nota">Em cada baffle contam as três faces principais: a base (C × L) e as duas laterais (2 × C × H). Área de absorção (A) = área total × coeficiente de absorção sonora (α) em cada banda.</p>
        </div>
      )
    }
    return (
      <div className="forma">
        <div className="sup-l2">
          <Segmentado
            rotulo="Como informar a área"
            valor={f ? 'forma' : 'area'}
            opcoes={[{ valor: 'forma', rotulo: 'Formato e dimensões' }, { valor: 'area', rotulo: 'Área total' }]}
            aoMudar={(modo) => alterar(it.id, (x) => {
              if (modo === 'area') delete x.forma
              else x.forma = formaPadrao('nuvem')
            })}
          />
          {!f && <label className="em"><Numero minimo={0} valor={it.quantidade} rotulo="Área total em m²" aoMudar={(v) => alterar(it.id, (x) => { x.quantidade = v })} /> m²</label>}
        </div>
        {f && (
          <>
            <div className="formas" role="group" aria-label="Formato da peça">
              {FORMAS_NUVEM.map((t) => (
                <button key={t} type="button" className="chip" aria-pressed={f.tipo === t} onClick={() => alterar(it.id, (x) => { x.forma = { ...x.forma!, tipo: t, medidas: [...MEDIDAS_PADRAO[t]] } })}>
                  <DesenhoForma tipo={t} />{FORMAS[t].nome}
                </button>
              ))}
            </div>
            {camposForma(it, f)}
          </>
        )}
        <p className="nota">Nas nuvens conta só a área de uma das faces. Área de absorção (A) = área total × coeficiente de absorção sonora (α) em cada banda.</p>
      </div>
    )
  }

  return (
    <>
      <h2>Nuvens e baffles</h2>
      <p className="lead">Cadastre os elementos suspensos do forro. Eles valem igualmente em todos os cenários de ocupação. Materiais com absorção por peça pedem só a quantidade. Com coeficiente de absorção sonora (α), as nuvens pedem a área de uma face e os baffles pedem comprimento, largura e altura.</p>
      <div className="sups">
        {itens.map((it) => (
          <div key={it.id} className="sup">
            <div className="sup-l1">
              <Segmentado rotulo="Elemento" valor={elementoDe(it)} opcoes={[{ valor: 'nuvem', rotulo: 'Nuvem' }, { valor: 'baffle', rotulo: 'Baffle' }]} aoMudar={(e) => trocarElemento(it.id, e)} />
              <Texto className="nome" rotulo="Nome" valor={it.nome} aoMudar={(v) => alterar(it.id, (x) => { x.nome = v || 'Nuvens' })} />
              <button type="button" className="icone-btn" aria-label={`Remover ${it.nome}`} onClick={() => mudar((c) => { c.itens = c.itens.filter((x) => x.id !== it.id) })}><Icone nome="lixo" /></button>
            </div>
            <div className="sup-l3">
              <SeletorMaterial rotulo={elementoDe(it) === 'baffle' ? 'Material do baffle' : 'Material da nuvem'} materiais={catalogo.todos.filter(suspenso)} valor={it.material} aoMudar={(v) => trocarMaterial(it.id, v)} />
            </div>
            {medidasSuspenso(it)}
          </div>
        ))}
        {!itens.length && <p className="suave">Nenhuma nuvem ou baffle neste cenário. Se o projeto não usa elementos suspensos, siga para a ocupação.</p>}
      </div>
      <div className="linha" style={{ marginTop: 12 }}>
        <button type="button" className="btn secundario" onClick={() => adicionar('nuvem')}><Icone nome="mais" />Adicionar nuvens</button>
        <button type="button" className="btn secundario" onClick={() => adicionar('baffle')}><Icone nome="mais" />Adicionar baffles</button>
      </div>
    </>
  )
}
