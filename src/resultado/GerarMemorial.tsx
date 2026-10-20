import { useEffect, useState } from 'react'
import type { Catalogo } from '../motor/materiais'
import type { Projeto } from '../motor/tipos'
import type { Perfil } from '../dados/conta'
import { especificacao } from '../memorial/conteudo'
import { Texto } from '../ui/campos'
import { Icone } from '../ui/Icone'
import { Modal } from '../ui/Modal'
import fonteRegular from '../memorial/fontes/LiberationSans-Regular.ttf?url'
import fonteNegrito from '../memorial/fontes/LiberationSans-Bold.ttf?url'

interface Props {
  projeto: Projeto
  cenarioId: string
  catalogo: Catalogo
  perfil: Perfil
  mudarPerfil: (p: Perfil) => void
  aoFechar: () => void
}

async function base64(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

type Downloads = { save: (r: { filename: string; data: Blob }) => Promise<unknown> }
type ClaudeJanela = { use?: (nome: string) => Promise<unknown> }

/** Na prévia publicada no claude.ai, o download passa pela plataforma; fora dela, `null`. */
function usarDownloads(): Promise<Downloads | null> {
  const claude = (window as unknown as { claude?: ClaudeJanela }).claude
  return claude?.use ? claude.use('downloads').then((d) => (d as Downloads | null) ?? null, () => null) : Promise.resolve(null)
}

// Sem acentos nem símbolos: alguns navegadores ignoram o nome sugerido quando ele tem caracteres fora do ASCII.
const nomeArquivo = (p: string) => `Memorial acustico - ${p.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w .()-]+/g, '-').replace(/\s*-\s*(-\s*)*/g, ' - ').replace(/\s+/g, ' ').trim() || 'projeto'}.pdf`

/** Escolha do cenário e dos dados do projetista, e geração do PDF do memorial. */
export function GerarMemorial({ projeto, cenarioId, catalogo, perfil, mudarPerfil, aoFechar }: Props) {
  const [id, setId] = useState(cenarioId)
  const [estado, setEstado] = useState<'pronto' | 'gerando' | { url: string } | { erro: string }>('pronto')
  const cenario = projeto.cenarios.find((c) => c.id === id) ?? projeto.cenarios[0]
  const comModelo = !!projeto.modelo && Object.keys(cenario.grupos ?? {}).length > 0
  const acusticos = especificacao(cenario, catalogo).length
  const url = typeof estado === 'object' && 'url' in estado ? estado.url : null
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  const [downloads, setDownloads] = useState<Downloads | null>(null)
  useEffect(() => { usarDownloads().then(setDownloads) }, [])

  async function gerar() {
    setEstado('gerando')
    try {
      // O gerador de PDF e as fontes só são carregados quando o memorial é pedido.
      const [{ gerarMemorial }, regular, negrito] = await Promise.all([import('../memorial/pdf'), base64(fonteRegular), base64(fonteNegrito)])
      const imagens = Object.fromEntries(especificacao(cenario, catalogo).flatMap((e) => (e.material.imagem?.startsWith('data:image/jpeg') ? [[e.material.id, e.material.imagem]] : [])))
      const doc = gerarMemorial({
        projeto, cenario, catalogo, imagens, data: new Date(), fontes: { regular, negrito },
        projetista: { nome: perfil.nome, registro: perfil.registro, empresa: perfil.empresa },
      })
      const blob = doc.output('blob')
      const link = URL.createObjectURL(blob)
      setEstado({ url: link })
      if (downloads) {
        await downloads.save({ filename: nomeArquivo(projeto.nome), data: blob }).catch(() => undefined)
        return
      }
      const a = document.createElement('a')
      a.href = link
      a.download = nomeArquivo(projeto.nome)
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      setEstado({ erro: e instanceof Error ? e.message : 'Não foi possível gerar o PDF.' })
    }
  }

  return (
    <Modal titulo="Gerar memorial" aoFechar={aoFechar}>
      <div className="formulario">
        <label className="campo">Cenário especificado
          <select value={cenario.id} onChange={(e) => { setId(e.target.value); setEstado('pronto') }}>
            {projeto.cenarios.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="campo">Nome do projetista
          <Texto valor={perfil.nome} placeholder="Seu nome completo" aoMudar={(v) => mudarPerfil({ ...perfil, nome: v.trim() })} />
        </label>
        <label className="campo">Cadastro profissional
          <Texto valor={perfil.registro} placeholder="ex.: CAU A123456-7 ou CREA 123456/D" aoMudar={(v) => mudarPerfil({ ...perfil, registro: v.trim() })} />
        </label>
      </div>
      <p className="nota">O nome e o cadastro ficam salvos em Minha conta.</p>
      <ul className="memorial-conteudo">
        <li>Identificação do projeto, do projetista e data de emissão</li>
        <li className={comModelo ? '' : 'fora'}>{comModelo ? 'Planta baixa, planta de forro e vistas internas do modelo 3D, com cotas e especificações' : 'Sem plantas e vistas: este cenário não tem um modelo 3D importado'}</li>
        <li>Quadro de especificações com {acusticos} {acusticos === 1 ? 'material acústico' : 'materiais acústicos'}</li>
        <li>Resultados de {projeto.cenarios.length === 1 ? 'um cenário' : `${projeto.cenarios.length} cenários`} e memória de cálculo do cenário especificado</li>
      </ul>
      {typeof estado === 'object' && 'erro' in estado && <p className="erro" role="alert">{estado.erro}</p>}
      {url && <p className="nota">Se o download não começou, <a href={url} download={nomeArquivo(projeto.nome)} target="_blank" rel="noreferrer">abra o PDF aqui</a>.</p>}
      <div className="linha" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <button type="button" className="btn secundario" onClick={aoFechar}>Fechar</button>
        <button type="button" className="btn primario" onClick={gerar} disabled={estado === 'gerando'}><Icone nome="documento" />{estado === 'gerando' ? 'Gerando…' : 'Gerar PDF'}</button>
      </div>
    </Modal>
  )
}
