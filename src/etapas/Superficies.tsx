import { useState } from 'react'
import { areaInformada, areaLivre, dimensionar, ehBase, itensSobre, validarSuperficies, type Dimensionamento } from '../motor/acustica'
import { paraSuperficie, type Catalogo } from '../motor/materiais'
import { CATEGORIAS, type Cenario, type CategoriaSuperficie, type Superficie } from '../motor/tipos'
import { novoId } from '../dados/exemplo'
import { Icone } from '../ui/Icone'
import { Numero, Segmentado, SeletorMaterial, Texto } from '../ui/campos'
import { fmt } from '../ui/formato'
import { EditorMaterial, type SalvarMaterial } from '../ui/EditorMaterial'

interface Props {
  cenario: Cenario
  catalogo: Catalogo
  mudar: (f: (c: Cenario) => void) => void
  salvarMaterial: (s: SalvarMaterial) => void
}

export function EtapaSuperficies({ cenario, catalogo, mudar, salvarMaterial }: Props) {
  const [erro, setErro] = useState<{ id: string; texto: string } | null>(null)
  const [dims, setDims] = useState<Record<string, Dimensionamento>>({})
  const [criando, setCriando] = useState(false)
  const materiais = catalogo.todos.filter(paraSuperficie)
  const bases = cenario.superficies.filter(ehBase)

  // Aplica a mudança numa cópia e só confirma se nenhum item ficar maior que a área livre da base.
  function alterar(id: string, f: (s: Superficie, c: Cenario) => string | void) {
    const copia: Cenario = structuredClone(cenario)
    const s = copia.superficies.find((x) => x.id === id)!
    const recusa = f(s, copia)
    if (recusa) { setErro({ id, texto: recusa }); return }
    const problema = validarSuperficies(copia)[0]
    if (problema) {
      const base = copia.superficies.find((b) => b.id === problema.superficie)!
      const texto = ehBase(s) && problema.superficie === s.id
        ? `A área de “${s.nome}” não pode ser menor que a soma do que está descontado dela (${fmt(itensSobre(copia, s.id).reduce((a, x) => a + areaInformada(x), 0))} m²).`
        : `A área passa da área livre de “${base.nome}”. Disponível: ${fmt(Math.max(0, areaLivre(cenario, base.id, s.id)))} m².`
      setErro({ id, texto })
      return
    }
    setErro(null)
    setDims({})
    mudar((c) => { c.superficies = copia.superficies })
  }

  function mudarCategoria(s: Superficie, c: Cenario, cat: CategoriaSuperficie): string | void {
    const eraBase = ehBase(s)
    if (eraBase && !CATEGORIAS[cat].base && itensSobre(c, s.id).length) return 'Esta superfície tem itens descontados dela. Remova ou mova esses itens antes de mudar o tipo.'
    s.categoria = cat
    if (CATEGORIAS[cat].base) delete s.base
    else if (!s.base) {
      const b = c.superficies.find((x) => ehBase(x) && x.id !== s.id)
      if (!b) return 'Crie antes uma superfície base (piso, parede ou forro/teto).'
      s.base = b.id
    }
  }

  function adicionarBase() {
    mudar((c) => { c.superficies.push({ id: novoId(), nome: 'Nova superfície', categoria: 'parede', modo: 'dimensoes', area: 15, largura: 5, altura: 3, material: catalogo.porNome('ALVENARIA LISA OU PINTADA').id }) })
  }
  function adicionarItem(baseId: string) {
    const livre = Math.max(0, areaLivre(cenario, baseId))
    setDims({})
    mudar((c) => {
      // Entra logo depois dos itens que já estão sobre a mesma base.
      const ultimo = c.superficies.map((x) => x.id === baseId || x.base === baseId).lastIndexOf(true)
      c.superficies.splice(ultimo + 1, 0, { id: novoId(), nome: 'Novo revestimento', categoria: 'revestimento', base: baseId, modo: 'area', area: Math.min(5, +livre.toFixed(2)), material: catalogo.porNome('AMBI 16.1 PAREDE').id })
    })
  }
  function remover(id: string) {
    setDims({})
    mudar((c) => { c.superficies = c.superficies.filter((s) => s.id !== id && s.base !== id) })
  }

  const linha = (s: Superficie) => {
    const base = ehBase(s)
    const d = dims[s.id]
    return (
      <div key={s.id} className={`sup ${base ? '' : 'filha'}`}>
        <div className="sup-l1">
          <Texto className="nome" rotulo="Nome da superfície" valor={s.nome} aoMudar={(v) => alterar(s.id, (x) => { x.nome = v || 'Superfície' })} />
          <select aria-label="Tipo" value={s.categoria} onChange={(e) => alterar(s.id, (x, c) => mudarCategoria(x, c, e.target.value as CategoriaSuperficie))}>
            {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}
          </select>
          {!base && (
            <label className="em">sobre
              <select value={s.base} onChange={(e) => alterar(s.id, (x) => { x.base = e.target.value })}>
                {bases.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
              </select>
            </label>
          )}
          <button type="button" className="icone-btn" aria-label={`Remover ${s.nome}`} onClick={() => remover(s.id)}><Icone nome="lixo" /></button>
        </div>
        <div className="sup-l2">
          <Segmentado
            rotulo="Como informar a área"
            valor={s.modo}
            opcoes={[{ valor: 'area', rotulo: 'Área' }, { valor: 'dimensoes', rotulo: 'Largura × altura' }]}
            aoMudar={(modo) => alterar(s.id, (x) => {
              if (modo === 'dimensoes' && x.modo !== 'dimensoes') {
                const a = areaInformada(x)
                x.largura ??= +Math.sqrt(a).toFixed(2)
                x.altura ??= x.largura ? +(a / x.largura).toFixed(2) : 0
              }
              if (modo === 'area') x.area = +areaInformada(x).toFixed(2)
              x.modo = modo
            })}
          />
          {s.modo === 'area' ? (
            <><Numero rotulo="Área em m²" minimo={0} valor={s.area} aoMudar={(v) => alterar(s.id, (x) => { x.area = v })} /> m²</>
          ) : (
            <>
              <Numero rotulo="Largura em m" minimo={0} valor={s.largura} aoMudar={(v) => alterar(s.id, (x) => { x.largura = v })} /> ×
              <Numero rotulo="Altura em m" minimo={0} valor={s.altura} aoMudar={(v) => alterar(s.id, (x) => { x.altura = v })} /> m = <b className="mono">{fmt(areaInformada(s))} m²</b>
            </>
          )}
          {base && itensSobre(cenario, s.id).length > 0 && <span className="livre">livre: <b className="mono">{fmt(areaLivre(cenario, s.id))} m²</b></span>}
        </div>
        <div className="sup-l3">
          <SeletorMaterial rotulo="Material" materiais={materiais} valor={s.material} aoMudar={(v) => alterar(s.id, (x) => { x.material = v })} />
          <span className="alfas mono">{catalogo.get(s.material).alfa.map((a) => fmt(a)).join(' · ')}</span>
          {(s.categoria === 'revestimento' || s.categoria === 'elemento') && (
            <button type="button" className="btn secundario pequeno" onClick={() => setDims({ ...dims, [s.id]: dimensionar(cenario, catalogo, { superficie: s.id }) })}><Icone nome="regua" />Dimensionar área</button>
          )}
        </div>
        {erro?.id === s.id && <p className="erro" role="alert">{erro.texto}</p>}
        {d && (
          <p className="dimres">
            {!d.encontrado ? (
              <span className="pill bad">{d.motivo === 'insuficiente' ? `Nem com ${fmt(d.limite, 1)} m² este material atende sozinho` : 'Nenhuma área equilibra todas as bandas'}</span>
            ) : (
              <>
                Com os demais itens deste cenário, <b>{d.semLimiteSuperior ? `a partir de ${fmt(d.minimo, 1)} m²` : `${fmt(d.minimo, 1)} a ${fmt(d.maximo, 1)} m²`}</b> deste material atendem.
                {!d.semLimiteSuperior && (
                  <button type="button" className="btn primario pequeno" onClick={() => alterar(s.id, (x) => { x.modo = 'area'; x.area = Math.round(d.minimo + d.maximo) / 2 })}>Usar {fmt(Math.round(d.minimo + d.maximo) / 2, 1)} m²</button>
                )}
              </>
            )}
          </p>
        )}
      </div>
    )
  }

  const orfas = cenario.superficies.filter((s) => !ehBase(s) && !bases.some((b) => b.id === s.base))
  return (
    <>
      <h2>Superfícies</h2>
      <p className="lead">Crie as superfícies do ambiente com a área ou as dimensões e o material de cada uma. Revestimentos, esquadrias e elementos são descontados da superfície base onde estão.</p>
      <div className="sups">
        {bases.map((b) => [
          linha(b),
          ...itensSobre(cenario, b.id).map(linha),
          <button key={`novo-${b.id}`} type="button" className="adicionar-item" onClick={() => adicionarItem(b.id)}>
            <Icone nome="mais" tamanho={16} />Novo revestimento, esquadria ou elemento sobre “{b.nome}”
          </button>,
        ])}
        {orfas.map(linha)}
        {!cenario.superficies.length && <p className="suave">Nenhuma superfície ainda. Comece pelo piso, pelas paredes e pelo forro/teto.</p>}
      </div>
      <div className="linha" style={{ marginTop: 12 }}>
        <button type="button" className="btn primario" onClick={adicionarBase}><Icone nome="mais" />Nova superfície base</button>
        <button type="button" className="btn secundario" onClick={() => setCriando(true)}><Icone nome="mais" />Criar material</button>
      </div>
      {criando && <EditorMaterial catalogo={catalogo} aoSalvar={(m) => { salvarMaterial(m); setCriando(false) }} aoFechar={() => setCriando(false)} />}
      <p className="nota">Aqui não entram público, assentos, nuvens, baffles nem materiais com absorção por unidade. Eles ficam nas etapas Nuvens/Baffles e Ocupação.</p>
    </>
  )
}
