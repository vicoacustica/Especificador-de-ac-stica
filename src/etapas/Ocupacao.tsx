import { assentoOcupado, assentoVazio, publico, type Catalogo } from '../motor/materiais'
import { ESTADOS, NOME_ESTADO, type Cenario, type ItemOcupacao, type TipoItem } from '../motor/tipos'
import { novoId } from '../dados/exemplo'
import { Icone } from '../ui/Icone'
import { Numero, SeletorMaterial, Texto } from '../ui/campos'

const NOME_TIPO: Record<TipoItem, string> = { assento: 'Assentos', publico: 'Público sem assento', suspenso: 'Nuvem ou baffle' }
export function EtapaOcupacao({ cenario, catalogo, mudar }: { cenario: Cenario; catalogo: Catalogo; mudar: (f: (c: Cenario) => void) => void }) {
  const lista = (p: Parameters<typeof catalogo.todos.filter>[0]) => catalogo.todos.filter(p)

  function alterar(id: string, f: (it: ItemOcupacao) => void) {
    mudar((c) => {
      const it = c.itens.find((x) => x.id === id)!
      f(it)
    })
  }
  function adicionar(tipo: TipoItem) {
    const it: ItemOcupacao =
      tipo === 'assento'
        ? { id: novoId(), tipo, nome: 'Assentos', quantidade: 20, material: catalogo.porNome('POLTRONA ESTOFADA VAZIA (UNIDADE)').id, materialOcupado: catalogo.porNome('POLTRONA ESTOFADA CHEIA (UNIDADE)').id }
        : tipo === 'publico'
          ? { id: novoId(), tipo, nome: 'Público em pé', quantidade: 20, material: catalogo.porNome('ADULTO EM PÉ (UNIDADE)').id }
          : { id: novoId(), tipo, nome: 'Nuvens', quantidade: 10, material: catalogo.porNome('TRISOFT NUVEM CLÁSSICA 1200X1200X50MM (POR UNIDADE)').id }
    mudar((c) => { c.itens.push(it) })
  }

  return (
    <>
      <h2>Ocupação</h2>
      <p className="lead">Cadastre assentos e público com suas quantidades, e escolha em quais cenários de ocupação o ambiente será avaliado.</p>
      <h3>Cenários de ocupação avaliados</h3>
      <div className="chips">
        {ESTADOS.map((e) => (
          <button key={e} type="button" className="chip" aria-pressed={cenario.ocupacoes[e]} onClick={() => mudar((c) => {
            c.ocupacoes[e] = !c.ocupacoes[e]
            if (!ESTADOS.some((x) => c.ocupacoes[x])) c.ocupacoes[e] = true
          })}>{NOME_ESTADO[e]} de ocupação</button>
        ))}
      </div>
      <p className="nota">Com ocupação de x%, essa fração dos assentos usa o material “ocupado” e o restante o “vazio”. O público sem assento entra com x% da quantidade.</p>
      <h3>Itens</h3>
      <div className="sups">
        {cenario.itens.filter((it) => it.tipo !== 'suspenso').map((it) => (
          <div key={it.id} className="sup">
            <div className="sup-l1">
              <span className="tag">{NOME_TIPO[it.tipo]}</span>
              <Texto className="nome" rotulo="Nome" valor={it.nome} aoMudar={(v) => alterar(it.id, (x) => { x.nome = v || NOME_TIPO[it.tipo] })} />
              <label className="em">Quantidade <Numero passo={1} minimo={0} valor={it.quantidade} aoMudar={(v) => alterar(it.id, (x) => { x.quantidade = Math.round(v) })} /> {it.tipo === 'assento' ? 'assentos' : 'pessoas'}</label>
              <button type="button" className="icone-btn" aria-label={`Remover ${it.nome}`} onClick={() => mudar((c) => { c.itens = c.itens.filter((x) => x.id !== it.id) })}><Icone nome="lixo" /></button>
            </div>
            <div className="sup-l3">
              {it.tipo === 'assento' ? (
                <>
                  <label className="campo cresce">Assento vazio<SeletorMaterial materiais={lista(assentoVazio)} valor={it.material} aoMudar={(v) => alterar(it.id, (x) => { x.material = v })} /></label>
                  <label className="campo cresce">Assento ocupado<SeletorMaterial materiais={lista(assentoOcupado)} valor={it.materialOcupado ?? it.material} aoMudar={(v) => alterar(it.id, (x) => { x.materialOcupado = v })} /></label>
                </>
              ) : (
                <SeletorMaterial rotulo="Material" materiais={lista(publico)} valor={it.material} aoMudar={(v) => alterar(it.id, (x) => { x.material = v })} />
              )}
            </div>
          </div>
        ))}
        {!cenario.itens.some((it) => it.tipo !== 'suspenso') && <p className="suave">Nenhum assento ou público. Ambientes sem público avaliam só a sala vazia.</p>}
      </div>
      <div className="linha" style={{ marginTop: 12 }}>
        <button type="button" className="btn secundario" onClick={() => adicionar('assento')}><Icone nome="mais" />Adicionar assentos</button>
        <button type="button" className="btn secundario" onClick={() => adicionar('publico')}><Icone nome="mais" />Adicionar público sem assento</button>
      </div>
    </>
  )
}
