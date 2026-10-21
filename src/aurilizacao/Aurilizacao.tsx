import { useEffect, useMemo, useRef, useState } from 'react'
import type { Catalogo } from '../motor/materiais'
import { ESTADOS, NOME_ESTADO, type EstadoOcupacao, type Projeto } from '../motor/tipos'
import { Segmentado } from '../ui/campos'
import { fmt } from '../ui/formato'
import { Icone } from '../ui/Icone'
import { AUDIOS, type AudioAnecoico } from './audios'
import { dadosDoCenario } from './cenario'
import { montarResposta } from './ri'

interface Props {
  projeto: Projeto
  catalogo: Catalogo
  /** Cenário aberto: já vem escolhido. */
  cenarioId: string
}

let contexto: AudioContext | null = null
const ctx = () => (contexto ??= new AudioContext())
const gravacoes = new Map<string, Promise<AudioBuffer>>()

/** Estalo sintético: meio ciclo de 1 ms, praticamente um impulso. */
function estalo(c: AudioContext): AudioBuffer {
  const b = c.createBuffer(1, Math.round(c.sampleRate * 0.6), c.sampleRate)
  const d = b.getChannelData(0)
  const n = Math.round(c.sampleRate * 0.001)
  for (let i = 0; i < n; i++) d[i + 200] = 0.9 * Math.sin((Math.PI * i) / n)
  return b
}

function carregar(a: AudioAnecoico): Promise<AudioBuffer> {
  const c = ctx()
  if (!a.arquivo) return Promise.resolve(estalo(c))
  let p = gravacoes.get(a.id)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}audios/${a.arquivo}`).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`)
      return r.arrayBuffer()
    }).then((buf) => c.decodeAudioData(buf))
    p.catch(() => gravacoes.delete(a.id))
    gravacoes.set(a.id, p)
  }
  return p
}

/**
 * Aurilização: a gravação anecoica escolhida passa pela resposta ao impulso do cenário,
 * com a fonte e o receptor da etapa 6 e a ocupação escolhida.
 */
export function Aurilizacao({ projeto, catalogo, cenarioId }: Props) {
  const [audio, setAudio] = useState(AUDIOS.find((a) => a.arquivo)?.id ?? AUDIOS[0].id)
  const [cenario, setCenario] = useState(cenarioId)
  const [estado, setEstado] = useState<EstadoOcupacao>('cheio')
  const [seco, setSeco] = useState(false)
  const [tocando, setTocando] = useState(false)
  const [erro, setErro] = useState('')
  const fonte = useRef<AudioBufferSourceNode | null>(null)
  const c = projeto.cenarios.find((x) => x.id === cenario) ?? projeto.cenarios[0]
  const escolhido = AUDIOS.find((a) => a.id === audio) ?? AUDIOS[0]

  useEffect(() => { setCenario(cenarioId) }, [cenarioId])
  useEffect(() => () => { fonte.current?.stop() }, [])

  const dados = useMemo(() => dadosDoCenario(c, catalogo, projeto.modelo, estado, 44100), [c, catalogo, projeto.modelo, estado])

  function parar() {
    try { fonte.current?.stop() } catch { /* já parou */ }
    fonte.current = null
    setTocando(false)
  }

  async function tocar(opcoes?: { seco?: boolean; cenario?: string }) {
    parar()
    setErro('')
    const semSala = opcoes?.seco ?? seco
    const ac = ctx()
    if (ac.state === 'suspended') await ac.resume()
    let buffer: AudioBuffer
    try { buffer = await carregar(escolhido) } catch {
      setErro('Não foi possível carregar a gravação. Verifique a conexão e tente de novo.')
      return
    }
    const alvo = opcoes?.cenario ? projeto.cenarios.find((x) => x.id === opcoes.cenario) ?? c : c
    const src = ac.createBufferSource()
    src.buffer = buffer
    const saida = ac.createGain()
    // Limitador: salas muito reverberantes somam energia e poderiam saturar.
    const limite = ac.createDynamicsCompressor()
    limite.threshold.value = -6; limite.ratio.value = 12; limite.attack.value = 0.003; limite.release.value = 0.25
    saida.gain.value = 0.7
    if (semSala) src.connect(saida)
    else {
      const d = alvo === c ? { ...dados, fs: ac.sampleRate } : dadosDoCenario(alvo, catalogo, projeto.modelo, estado, ac.sampleRate)
      const ri = montarResposta({ ...d, fs: ac.sampleRate })
      const rb = ac.createBuffer(1, ri.length, ac.sampleRate)
      rb.copyToChannel(ri as Float32Array<ArrayBuffer>, 0)
      const conv = ac.createConvolver()
      conv.normalize = false
      conv.buffer = rb
      src.connect(conv).connect(saida)
    }
    saida.connect(limite).connect(ac.destination)
    src.onended = () => { if (fonte.current === src) { fonte.current = null; setTocando(false) } }
    src.start()
    fonte.current = src
    setTocando(true)
  }

  const t500 = dados.tempos[2]
  return (
    <section className="aurilizacao">
      <div className="aurilizacao-titulo">
        <span className="aurilizacao-icone"><Icone nome="som" tamanho={20} /></span>
        <span>
          <b>Aurilização</b>
          <span className="suave">Ouça uma gravação anecoica (sem sala) como se fosse tocada no ambiente, com a fonte e o receptor da etapa Traçado de raios. Use fones de ouvido.</span>
        </span>
      </div>
      <div className="aurilizacao-grade">
        <label className="campo">Gravação
          <select value={audio} onChange={(e) => { setAudio(e.target.value); parar() }}>
            {AUDIOS.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </label>
        <div className="campo"><span>Ocupação</span>
          <Segmentado rotulo="Ocupação na aurilização" valor={estado} aoMudar={(e) => { setEstado(e); parar() }} opcoes={ESTADOS.map((e) => ({ valor: e, rotulo: NOME_ESTADO[e] }))} />
        </div>
      </div>
      {projeto.cenarios.length > 1 && (
        <div className="chips" role="group" aria-label="Cenário">
          {projeto.cenarios.map((x) => (
            <button key={x.id} type="button" className="chip" aria-pressed={x.id === c.id} onClick={() => { setCenario(x.id); if (tocando && !seco) void tocar({ cenario: x.id }) }}>{x.nome}</button>
          ))}
        </div>
      )}
      <p className="nota">{escolhido.descricao} {escolhido.credito}{escolhido.licenca !== 'Livre' ? `, ${escolhido.licenca}` : ''}.</p>
      <div className="linha">
        {tocando
          ? <button type="button" className="btn primario" onClick={parar}><Icone nome="parar" />Parar</button>
          : <button type="button" className="btn primario" onClick={() => void tocar()}><Icone nome="tocar" />Ouvir {seco ? 'sem sala' : `em “${c.nome}”`}</button>}
        <label className="marcar"><input type="checkbox" checked={seco} onChange={(e) => { setSeco(e.target.checked); if (tocando) void tocar({ seco: e.target.checked }) }} />Som anecoico, sem a sala</label>
      </div>
      <p className="nota">Tempo de reverberação (T) a 500 Hz: {fmt(t500)} s · distância entre fonte e receptor: {fmt(dados.distancia)} m · {dados.reflexoes.length} reflexões especulares até a 3ª ordem, mais a cauda reverberante de cada banda.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
    </section>
  )
}
