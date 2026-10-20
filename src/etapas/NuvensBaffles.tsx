import { suspenso, type Catalogo } from '../motor/materiais'
import { areaDaForma, FORMAS, type Cenario, type ItemOcupacao, type TipoForma } from '../motor/tipos'
import { novoId } from '../dados/exemplo'
import { Icone } from '../ui/Icone'
import { Numero, Segmentado, SeletorMaterial, Texto } from '../ui/campos'
import { fmt } from '../ui/formato'

const FORMA_PADRAO = { tipo: 'retangulo' as TipoForma, medidas: [1.2, 0.6], quantidade: 10 }
const MEDIDAS_PADRAO: Record<TipoForma, number[]> = { quadrado: [1.2], retangulo: [1.2, 0.6], circulo: [1.2], triangulo: [1.2, 1], trapezio: [1.2, 0.6, 0.6] }

function DesenhoForma({ tipo }: { tipo: TipoForma }) {
  const d = {
    quadrado: <rect x={4} y={4} width={16} height={16} rx={1} />,
    retangulo: <rect x={2} y={7} width={20} height={10} rx={1} />,
    circulo: <circle cx={12} cy={12} r={8.5} />,
    triangulo: <path d="M12 4 21 20H3z" />,
    trapezio: <path d="M7 6h10l5 12H2z" />,
  }[tipo]
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" fillOpacity={0.18} stroke="currentColor" strokeWidth={1.6} aria-hidden="true">{d}</svg>
}

export function EtapaNuvens({ cenario, catalogo, mudar }: { cenario: Cenario; catalogo: Catalogo; mudar: (f: (c: Cenario) => void) => void }) {
  const porPeca = (it: ItemOcupacao) => catalogo.get(it.material).unidade
  const itens = cenario.itens.filter((it) => it.tipo === 'suspenso')

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
      if (antes && !depois) x.forma = { ...FORMA_PADRAO, quantidade: Math.max(1, Math.round(x.quantidade)) }
      if (!antes && depois) { x.quantidade = x.forma?.quantidade ?? 10; delete x.forma }
    })
  }
  function adicionar(nome: string) {
    mudar((c) => { c.itens.push({ id: novoId(), tipo: 'suspenso', nome, quantidade: 10, material: catalogo.porNome('TRISOFT NUVEM CLÁSSICA 1200X1200X50MM (POR UNIDADE)').id }) })
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
    return (
      <div className="forma">
        <div className="sup-l2">
          <Segmentado
            rotulo="Como informar a área"
            valor={f ? 'forma' : 'area'}
            opcoes={[{ valor: 'forma', rotulo: 'Formato e dimensões' }, { valor: 'area', rotulo: 'Área total' }]}
            aoMudar={(modo) => alterar(it.id, (x) => {
              if (modo === 'area') delete x.forma
              else x.forma = { ...FORMA_PADRAO }
            })}
          />
          {!f && <label className="em"><Numero minimo={0} valor={it.quantidade} rotulo="Área total em m²" aoMudar={(v) => alterar(it.id, (x) => { x.quantidade = v })} /> m²</label>}
        </div>
        {f && (
          <>
            <div className="formas" role="group" aria-label="Formato da peça">
              {(Object.keys(FORMAS) as TipoForma[]).map((t) => (
                <button key={t} type="button" className="chip" aria-pressed={f.tipo === t} onClick={() => alterar(it.id, (x) => { x.forma = { ...x.forma!, tipo: t, medidas: MEDIDAS_PADRAO[t] } })}>
                  <DesenhoForma tipo={t} />{FORMAS[t].nome}
                </button>
              ))}
            </div>
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
          </>
        )}
        <p className="nota">Este material tem coeficiente de absorção sonora (α), então a absorção vem da área: Área de absorção (A) = área total × α em cada banda.</p>
      </div>
    )
  }

  return (
    <>
      <h2>Nuvens e baffles</h2>
      <p className="lead">Cadastre os elementos suspensos do forro. Eles valem igualmente em todos os cenários de ocupação. Materiais com absorção por peça pedem a quantidade; materiais com coeficiente de absorção sonora (α) pedem a área total ou o formato, as dimensões e a quantidade.</p>
      <div className="sups">
        {itens.map((it) => (
          <div key={it.id} className="sup">
            <div className="sup-l1">
              <span className="tag">Nuvem ou baffle</span>
              <Texto className="nome" rotulo="Nome" valor={it.nome} aoMudar={(v) => alterar(it.id, (x) => { x.nome = v || 'Nuvens' })} />
              <button type="button" className="icone-btn" aria-label={`Remover ${it.nome}`} onClick={() => mudar((c) => { c.itens = c.itens.filter((x) => x.id !== it.id) })}><Icone nome="lixo" /></button>
            </div>
            <div className="sup-l3">
              <SeletorMaterial rotulo="Nuvem ou baffle" materiais={catalogo.todos.filter(suspenso)} valor={it.material} aoMudar={(v) => trocarMaterial(it.id, v)} />
            </div>
            {medidasSuspenso(it)}
          </div>
        ))}
        {!itens.length && <p className="suave">Nenhuma nuvem ou baffle neste cenário. Se o projeto não usa elementos suspensos, siga para a ocupação.</p>}
      </div>
      <div className="linha" style={{ marginTop: 12 }}>
        <button type="button" className="btn secundario" onClick={() => adicionar('Nuvens')}><Icone nome="mais" />Adicionar nuvens</button>
        <button type="button" className="btn secundario" onClick={() => adicionar('Baffles')}><Icone nome="mais" />Adicionar baffles</button>
      </div>
    </>
  )
}
