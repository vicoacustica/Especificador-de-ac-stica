import { useRef, useState } from 'react'
import { Icone } from './Icone'
import { redimensionarImagem } from './imagem'
import { Modal } from './Modal'

/** Nome e imagem de capa de um projeto, na criação ou na edição. */
export function DadosProjeto(props: { titulo: string; nome?: string; imagem?: string; acao: string; aoSalvar: (nome: string, imagem: string | undefined) => void; aoFechar: () => void }) {
  const [nome, setNome] = useState(props.nome ?? '')
  const [imagem, setImagem] = useState(props.imagem)
  const [erro, setErro] = useState<string | null>(null)
  const arquivo = useRef<HTMLInputElement>(null)

  async function enviar(f: File | undefined) {
    if (!f) return
    try { setImagem(await redimensionarImagem(f, 960)); setErro(null) } catch (e) { setErro((e as Error).message) }
  }
  return (
    <Modal titulo={props.titulo} aoFechar={props.aoFechar}>
      <label className="campo">Nome do projeto
        <input type="text" value={nome} placeholder="ex.: Escola Municipal, sala 12" onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') props.aoSalvar(nome.trim() || 'Novo projeto', imagem) }} />
      </label>
      <div className="campo">Imagem do projeto (opcional)
        <button type="button" className="capa-envio" onClick={() => arquivo.current?.click()}>
          {imagem ? <img src={imagem} alt="Imagem escolhida para o projeto" /> : <span><Icone nome="enviar" tamanho={22} />Enviar foto, render ou planta</span>}
        </button>
        <input ref={arquivo} type="file" accept="image/*" hidden onChange={(e) => enviar(e.target.files?.[0])} />
      </div>
      {imagem && <button type="button" className="btn fantasma pequeno" style={{ justifySelf: 'start' }} onClick={() => setImagem(undefined)}>Remover imagem</button>}
      <p className="nota">Sem imagem, o projeto usa uma foto do tipo de ambiente escolhido na etapa 1.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="linha acoes">
        <button type="button" className="btn primario" onClick={() => props.aoSalvar(nome.trim() || 'Novo projeto', imagem)}><Icone nome="ok" />{props.acao}</button>
        <button type="button" className="btn fantasma" onClick={props.aoFechar}>Cancelar</button>
      </div>
    </Modal>
  )
}
