import { useState } from 'react'
import { nomeCategoria, TIPOS_OCUPACAO, type Catalogo } from '../motor/materiais'
import { BANDAS, type Material, type PorBanda } from '../motor/tipos'
import { novoId } from '../dados/exemplo'

const NOVA = '__nova__'

export function NovoMaterial({ catalogo, aoSalvar, aoCancelar }: { catalogo: Catalogo; aoSalvar: (m: Material) => void; aoCancelar: () => void }) {
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('ACÚSTICO - PERFURADO')
  const [categoriaNova, setCategoriaNova] = useState('')
  const [alfa, setAlfa] = useState<string[]>(['0.10', '0.30', '0.60', '0.80', '0.80', '0.70'])
  const [unidade, setUnidade] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function salvar() {
    const tipo = categoria === NOVA ? categoriaNova.trim().toUpperCase() : categoria
    const valores = alfa.map((a) => parseFloat(a.replace(',', '.')))
    if (!nome.trim()) return setErro('Dê um nome ao material.')
    if (!tipo) return setErro('Escolha ou crie uma categoria.')
    if (valores.some((a) => Number.isNaN(a) || a < 0 || a > 1.5)) return setErro('Os seis coeficientes devem estar entre 0 e 1,5.')
    aoSalvar({
      id: `proprio-${novoId()}`,
      nome: nome.trim().toUpperCase() + (unidade ? ' (POR UNIDADE)' : ''),
      tipo,
      alfa: valores as PorBanda,
      unidade,
      proprio: true,
    })
  }

  return (
    <div className="novo-mat">
      <h3 style={{ marginTop: 0 }}>Novo material</h3>
      <div className="row">
        <label className="f grow">Nome do material
          <input type="text" value={nome} autoFocus placeholder="ex.: Painel de madeira ripada 20 mm" onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="f">Categoria
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {catalogo.categorias().filter((t) => !TIPOS_OCUPACAO.includes(t)).map((t) => <option key={t} value={t}>{nomeCategoria(t)}</option>)}
            <option value={NOVA}>Criar nova categoria...</option>
          </select>
        </label>
        {categoria === NOVA && (
          <label className="f">Nova categoria
            <input type="text" value={categoriaNova} placeholder="ex.: Madeira ripada" onChange={(e) => setCategoriaNova(e.target.value)} />
          </label>
        )}
      </div>
      <div className="row">
        {BANDAS.map((b, i) => (
          <label key={b} className="f">α {b} Hz
            <input type="number" step={0.01} min={0} max={1.5} value={alfa[i]} onChange={(e) => setAlfa(alfa.map((a, j) => (j === i ? e.target.value : a)))} />
          </label>
        ))}
      </div>
      <label className="chk"><input type="checkbox" checked={unidade} onChange={(e) => setUnidade(e.target.checked)} /> Absorção por unidade (m² Sabine por peça, para nuvens e baffles)</label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="row">
        <button type="button" className="btn" onClick={salvar}>Salvar material</button>
        <button type="button" className="btn ghost" onClick={aoCancelar}>Cancelar</button>
      </div>
      <p className="note">O coeficiente de absorção sonora (α) vai de 0 a 1 na maioria dos materiais. Ensaios em câmara reverberante podem passar de 1, como em vários produtos da base.</p>
    </div>
  )
}
