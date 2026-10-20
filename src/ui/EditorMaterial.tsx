import { useRef, useState } from 'react'
import { nomeCategoria, TIPOS_OCUPACAO, type Catalogo } from '../motor/materiais'
import { BANDAS, type Material, type PorBanda } from '../motor/tipos'
import { novoId } from '../dados/exemplo'
import { Icone } from './Icone'
import { redimensionarImagem } from './imagem'
import { BarrasAlfa, MiniaturaMaterial } from './MaterialVisual'
import { Modal } from './Modal'

const NOVA = '__nova__'

export interface SalvarMaterial {
  material: Material
  /** Nova imagem (data URL), null para remover, undefined para manter. */
  imagem?: string | null
}

/**
 * Criação e edição de material. Materiais próprios são editáveis por inteiro; nos da planilha
 * só a imagem muda, e os coeficientes podem ser ajustados numa cópia.
 */
export function EditorMaterial(props: {
  catalogo: Catalogo
  material?: Material
  aoSalvar: (s: SalvarMaterial) => void
  aoFechar: () => void
}) {
  const original = props.material
  const daBase = !!original && !original.proprio
  const [nome, setNome] = useState(original ? original.nome.replace(/\s*\((POR )?UNIDADE\)$/i, '') : '')
  const [categoria, setCategoria] = useState(original?.tipo ?? 'ACÚSTICO - PERFURADO')
  const [categoriaNova, setCategoriaNova] = useState('')
  const [alfa, setAlfa] = useState<string[]>((original?.alfa ?? [0.1, 0.3, 0.6, 0.8, 0.8, 0.7]).map((a) => String(a)))
  const [unidade, setUnidade] = useState(original?.unidade ?? false)
  const [imagem, setImagem] = useState<string | null | undefined>(undefined)
  const [erro, setErro] = useState<string | null>(null)
  const arquivo = useRef<HTMLInputElement>(null)

  const valores = alfa.map((a) => parseFloat(a.replace(',', '.')))
  const previa: Material = {
    id: original?.id ?? 'previa',
    nome: nome || 'Novo material',
    tipo: categoria === NOVA ? categoriaNova || 'SEM CATEGORIA' : categoria,
    alfa: valores.map((v) => (Number.isNaN(v) ? 0 : v)) as PorBanda,
    unidade,
    imagem: imagem === undefined ? original?.imagem : imagem ?? undefined,
  }

  async function enviar(f: File | undefined) {
    if (!f) return
    try {
      setImagem(await redimensionarImagem(f))
      setErro(null)
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  function salvar(comoCopia = false) {
    if (daBase && !comoCopia) {
      props.aoSalvar({ material: original!, imagem })
      return
    }
    const tipo = categoria === NOVA ? categoriaNova.trim().toUpperCase() : categoria
    if (!nome.trim()) return setErro('Dê um nome ao material.')
    if (!tipo) return setErro('Escolha ou crie uma categoria.')
    if (valores.some((a) => Number.isNaN(a) || a < 0 || a > (unidade ? 20 : 1.5))) {
      return setErro(unidade ? 'Os seis valores de absorção por peça devem estar entre 0 e 20 m².' : 'Os seis coeficientes devem estar entre 0 e 1,5.')
    }
    const base = nome.trim().toUpperCase().replace(/\s*\((POR )?UNIDADE\)$/i, '')
    props.aoSalvar({
      material: {
        id: original?.proprio && !comoCopia ? original.id : `proprio-${novoId()}`,
        nome: (comoCopia && daBase ? `${base} (CÓPIA)` : base) + (unidade ? ' (POR UNIDADE)' : ''),
        tipo,
        alfa: valores as PorBanda,
        unidade,
        proprio: true,
      },
      imagem: imagem === undefined && comoCopia ? original?.imagem : imagem,
    })
  }

  const titulo = !original ? 'Novo material' : daBase ? 'Material da planilha' : 'Editar material'
  return (
    <Modal titulo={titulo} aoFechar={props.aoFechar} largo>
      <div className="editor-material">
        <div className="editor-imagem">
          <MiniaturaMaterial material={previa} />
          <input ref={arquivo} type="file" accept="image/*" hidden onChange={(e) => enviar(e.target.files?.[0])} />
          <div className="linha">
            <button type="button" className="btn secundario" onClick={() => arquivo.current?.click()}><Icone nome="enviar" />{previa.imagem ? 'Trocar imagem' : 'Enviar imagem'}</button>
            {previa.imagem && <button type="button" className="btn fantasma" onClick={() => setImagem(null)}>Remover</button>}
          </div>
          <p className="nota">Foto ou textura do acabamento. A imagem é reduzida para ficar leve.</p>
        </div>
        <div className="editor-campos">
          <label className="campo">Nome do material
            <input type="text" value={nome} disabled={daBase} placeholder="ex.: Painel de madeira ripada 20 mm" onChange={(e) => setNome(e.target.value)} />
          </label>
          <div className="linha">
            <label className="campo cresce">Categoria
              <select value={categoria} disabled={daBase} onChange={(e) => setCategoria(e.target.value)}>
                {props.catalogo.categorias().filter((t) => !TIPOS_OCUPACAO.includes(t) || t === original?.tipo).map((t) => <option key={t} value={t}>{nomeCategoria(t)}</option>)}
                <option value={NOVA}>Criar nova categoria...</option>
              </select>
            </label>
            {categoria === NOVA && (
              <label className="campo cresce">Nova categoria
                <input type="text" value={categoriaNova} placeholder="ex.: Madeira ripada" onChange={(e) => setCategoriaNova(e.target.value)} />
              </label>
            )}
          </div>
          <fieldset className="alfas-campos" disabled={daBase}>
            <legend>{unidade ? 'Absorção por peça (m² Sabine)' : 'Coeficiente de absorção sonora (α)'} por banda</legend>
            {BANDAS.map((b, i) => (
              <label key={b} className="campo">{b} Hz
                <input type="number" step={0.01} min={0} value={alfa[i]} onChange={(e) => setAlfa(alfa.map((a, j) => (j === i ? e.target.value : a)))} />
              </label>
            ))}
            <BarrasAlfa alfa={previa.alfa} unidade={unidade} />
          </fieldset>
          <label className="marcar"><input type="checkbox" checked={unidade} disabled={daBase} onChange={(e) => setUnidade(e.target.checked)} /> Absorção por unidade (nuvens e baffles vendidos por peça)</label>
          {daBase && <p className="nota">Os coeficientes deste material vêm do ensaio do fabricante, registrado na planilha. Você pode trocar a imagem ou criar uma cópia para ajustar os valores.</p>}
          {!daBase && <p className="nota">O coeficiente de absorção sonora (α) vai de 0 a 1 na maioria dos materiais. Ensaios em câmara reverberante podem passar de 1, como em vários produtos da base.</p>}
          {erro && <p className="erro" role="alert">{erro}</p>}
          <div className="linha acoes">
            <button type="button" className="btn primario" onClick={() => salvar()}><Icone nome="ok" />Salvar</button>
            {daBase && <button type="button" className="btn secundario" onClick={() => salvar(true)}><Icone nome="copiar" />Criar cópia editável</button>}
            <button type="button" className="btn fantasma" onClick={props.aoFechar}>Cancelar</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
