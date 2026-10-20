import { useState } from 'react'
import { dimensionar, type Dimensionamento } from '../motor/acustica'
import { assentoOcupado, assentoVazio, publico, suspenso, type Catalogo } from '../motor/materiais'
import { ESTADOS, NOME_ESTADO, type Cenario, type ItemOcupacao, type TipoItem } from '../motor/tipos'
import { novoId } from '../dados/exemplo'
import { Icone } from '../ui/Icone'
import { Numero, SeletorMaterial, Texto } from '../ui/campos'

const NOME_TIPO: Record<TipoItem, string> = { assento: 'Assentos', publico: 'Público sem assento', suspenso: 'Nuvem ou baffle' }

export function EtapaOcupacao({ cenario, catalogo, mudar }: { cenario: Cenario; catalogo: Catalogo; mudar: (f: (c: Cenario) => void) => void }) {
  const [dims, setDims] = useState<Record<string, Dimensionamento>>({})
  const lista = (p: Parameters<typeof catalogo.todos.filter>[0]) => catalogo.todos.filter(p)
  const unidade = (it: ItemOcupacao) => (it.tipo === 'suspenso' && !catalogo.get(it.material).unidade ? 'm²' : 'un.')

  function alterar(id: string, f: (it: ItemOcupacao) => void) {
    setDims({})
    mudar((c) => { f(c.itens.find((x) => x.id === id)!) })
  }
  function adicionar(tipo: TipoItem) {
    const it: ItemOcupacao =
      tipo === 'assento'
        ? { id: novoId(), tipo, nome: 'Assentos', quantidade: 20, material: catalogo.porNome('POLTRONA ESTOFADA VAZIA (UNIDADE)').id, materialOcupado: catalogo.porNome('POLTRONA ESTOFADA CHEIA (UNIDADE)').id }
        : tipo === 'publico'
          ? { id: novoId(), tipo, nome: 'Público em pé', quantidade: 20, material: catalogo.porNome('ADULTO EM PÉ (UNIDADE)').id }
          : { id: novoId(), tipo, nome: 'Nuvens', quantidade: 10, material: catalogo.porNome('TRISOFT NUVEM CLÁSSICA 1200X1200X50MM (POR UNIDADE)').id }
    setDims({})
    mudar((c) => { c.itens.push(it) })
  }

  return (
    <>
      <h2>Ocupação, nuvens e baffles</h2>
      <p className="lead">Cadastre público, assentos e elementos suspensos com suas quantidades, e escolha em quais cenários de ocupação o ambiente será avaliado.</p>
      <h3>Cenários de ocupação avaliados</h3>
      <div className="chips">
        {ESTADOS.map((e) => (
          <button key={e} type="button" className="chip" aria-pressed={cenario.ocupacoes[e]} onClick={() => mudar((c) => {
            c.ocupacoes[e] = !c.ocupacoes[e]
            if (!ESTADOS.some((x) => c.ocupacoes[x])) c.ocupacoes[e] = true
          })}>{NOME_ESTADO[e]} de ocupação</button>
        ))}
      </div>
      <p className="nota">Com ocupação de x%, essa fração dos assentos usa o material “ocupado” e o restante o “vazio”. O público sem assento entra com x% da quantidade. Nuvens e baffles valem em todos os cenários.</p>
      <h3>Itens</h3>
      <div className="sups">
        {cenario.itens.map((it) => {
          const d = dims[it.id]
          return (
            <div key={it.id} className="sup">
              <div className="sup-l1">
                <span className="tag">{NOME_TIPO[it.tipo]}</span>
                <Texto className="nome" rotulo="Nome" valor={it.nome} aoMudar={(v) => alterar(it.id, (x) => { x.nome = v || NOME_TIPO[it.tipo] })} />
                <label className="em">Quantidade <Numero passo={1} minimo={0} valor={it.quantidade} aoMudar={(v) => alterar(it.id, (x) => { x.quantidade = it.tipo === 'suspenso' && unidade(it) === 'm²' ? v : Math.round(v) })} /> {unidade(it)}</label>
                <button type="button" className="icone-btn" aria-label={`Remover ${it.nome}`} onClick={() => { setDims({}); mudar((c) => { c.itens = c.itens.filter((x) => x.id !== it.id) }) }}><Icone nome="lixo" /></button>
              </div>
              <div className="sup-l3">
                {it.tipo === 'assento' ? (
                  <>
                    <label className="campo cresce">Assento vazio<SeletorMaterial materiais={lista(assentoVazio)} valor={it.material} aoMudar={(v) => alterar(it.id, (x) => { x.material = v })} /></label>
                    <label className="campo cresce">Assento ocupado<SeletorMaterial materiais={lista(assentoOcupado)} valor={it.materialOcupado ?? it.material} aoMudar={(v) => alterar(it.id, (x) => { x.materialOcupado = v })} /></label>
                  </>
                ) : (
                  <SeletorMaterial rotulo="Material" materiais={lista(it.tipo === 'publico' ? publico : suspenso)} valor={it.material} aoMudar={(v) => alterar(it.id, (x) => { x.material = v })} />
                )}
                {it.tipo === 'suspenso' && (
                  <button type="button" className="btn secundario pequeno" onClick={() => setDims({ ...dims, [it.id]: dimensionar(cenario, catalogo, { item: it.id }) })}><Icone nome="regua" />Dimensionar quantidade</button>
                )}
              </div>
              {d && (
                <p className="dimres">
                  {!d.encontrado ? (
                    <span className="pill bad">{d.motivo === 'insuficiente' ? `Nem com ${d.limite} ${unidade(it)} este elemento atende sozinho` : 'Nenhuma quantidade equilibra todas as bandas'}</span>
                  ) : (
                    <>
                      Com os demais itens deste cenário, <b>{d.semLimiteSuperior ? `a partir de ${d.minimo}` : `${d.minimo} a ${d.maximo}`} {unidade(it)}</b> atendem.
                      {!d.semLimiteSuperior && (
                        <button type="button" className="btn primario pequeno" onClick={() => alterar(it.id, (x) => { x.quantidade = Math.round((d.minimo + d.maximo) / 2) })}>Usar {Math.round((d.minimo + d.maximo) / 2)}</button>
                      )}
                    </>
                  )}
                </p>
              )}
            </div>
          )
        })}
        {!cenario.itens.length && <p className="suave">Nenhum item. Ambientes sem público avaliam só a sala vazia.</p>}
      </div>
      <div className="linha" style={{ marginTop: 12 }}>
        <button type="button" className="btn secundario" onClick={() => adicionar('assento')}><Icone nome="mais" />Adicionar assentos</button>
        <button type="button" className="btn secundario" onClick={() => adicionar('publico')}><Icone nome="mais" />Adicionar público sem assento</button>
        <button type="button" className="btn secundario" onClick={() => adicionar('suspenso')}><Icone nome="mais" />Adicionar nuvens ou baffles</button>
      </div>
    </>
  )
}
