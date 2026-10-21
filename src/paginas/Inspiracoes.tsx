import { useEffect, useRef, useState } from 'react'
import { AMBIENTES, inspiracoes, type Tipologia } from '../dados/ambientes'
import type { Perfil } from '../dados/conta'
import { Icone } from '../ui/Icone'
import { Modal } from '../ui/Modal'

const PASTA = /^https:\/\/([a-z]{2,3}\.)?pinterest\.[a-z.]+\/[^/?#]+\/[^/?#]+\/?$/i
const ROTACAO_MS = 5000

declare global { interface Window { PinUtils?: { build: () => void } } }

/** Widget oficial de pasta do Pinterest (pinit.js). Sem o script, mostra um atalho para a pasta. */
function PastaPinterest({ url }: { url: string }) {
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'falhou'>(window.PinUtils ? 'ok' : 'carregando')
  useEffect(() => {
    if (window.PinUtils) { window.PinUtils.build(); return }
    let script = document.querySelector<HTMLScriptElement>('script[data-pinit]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://assets.pinterest.com/js/pinit.js'
      script.async = true
      script.dataset.pinit = '1'
      document.body.appendChild(script)
    }
    const ok = () => { setEstado('ok'); window.PinUtils?.build() }
    const falhou = () => setEstado('falhou')
    script.addEventListener('load', ok)
    script.addEventListener('error', falhou)
    const limite = setTimeout(() => { if (!window.PinUtils) falhou() }, 8000)
    return () => { script!.removeEventListener('load', ok); script!.removeEventListener('error', falhou); clearTimeout(limite) }
  }, [url])
  return (
    <div className="pasta-pinterest">
      {estado !== 'falhou' && (
        <a key={url} data-pin-do="embedBoard" data-pin-board-width="1200" data-pin-scale-height="240" data-pin-scale-width="115" href={url}>Carregando a pasta do Pinterest…</a>
      )}
      {estado === 'falhou' && (
        <a className="pasta-atalho" href={url} target="_blank" rel="noopener noreferrer">
          <Icone nome="imagem" tamanho={22} /><span><b>Abrir minha pasta no Pinterest</b><small>Não foi possível mostrar as imagens aqui. O link abre a pasta em uma nova aba.</small></span><Icone nome="seta" />
        </a>
      )}
    </div>
  )
}

export function Inspiracoes({ tipologias, perfil, mudarPerfil }: { tipologias: Tipologia[]; perfil: Perfil; mudarPerfil: (p: Perfil) => void }) {
  const trilho = useRef<HTMLDivElement>(null)
  const [pausado, setPausado] = useState(false)
  const [personalizando, setPersonalizando] = useState(false)
  const [link, setLink] = useState(perfil.pinterest)
  const cartoes = inspiracoes(tipologias)
  const usaPasta = !!perfil.pinterest

  function rolar(direcao: 1 | -1) {
    const t = trilho.current
    if (!t) return
    const fim = t.scrollLeft + t.clientWidth >= t.scrollWidth - 4
    if (direcao === 1 && fim) t.scrollTo({ left: 0, behavior: 'smooth' })
    else t.scrollBy({ left: direcao * Math.max(260, t.clientWidth * 0.8), behavior: 'smooth' })
  }

  useEffect(() => {
    if (usaPasta || pausado || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => rolar(1), ROTACAO_MS)
    return () => clearInterval(id)
  }, [usaPasta, pausado])

  const nomes = tipologias.map((t) => AMBIENTES[t].nome.toLowerCase())
  return (
    <section className="bloco inspiracoes" onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)} onFocus={() => setPausado(true)} onBlur={() => setPausado(false)}>
      <div className="bloco-topo">
        <div>
          <h2>Inspirações</h2>
          <p className="suave">{usaPasta ? 'Sua pasta do Pinterest.' : `Projetos de ${nomes.join(', ').replace(/, ([^,]*)$/, ' e $1')} com tratamento acústico, no Pinterest.`}</p>
        </div>
        <div className="linha">
          {!usaPasta && (
            <>
              <button type="button" className="icone-btn redondo" aria-label="Anteriores" onClick={() => rolar(-1)}><Icone nome="voltar" /></button>
              <button type="button" className="icone-btn redondo seguinte" aria-label="Próximas" onClick={() => rolar(1)}><Icone nome="voltar" /></button>
            </>
          )}
          <button type="button" className="btn secundario pequeno" onClick={() => { setLink(perfil.pinterest); setPersonalizando(true) }}><Icone nome="ajustes" tamanho={16} />Personalizar</button>
        </div>
      </div>
      {usaPasta ? <PastaPinterest url={perfil.pinterest} /> : (
        <div className="trilho" ref={trilho}>
          {cartoes.map((c) => (
            <a key={c.id} className="inspiracao" href={c.url} target="_blank" rel="noopener noreferrer">
              <span className="inspiracao-topo">
                <span className="fonte pinterest">Pinterest · {c.idioma}</span>
                <span className="suave">{AMBIENTES[c.tipologia].nome}</span>
              </span>
              <span className="inspiracao-texto">
                <Icone nome="busca" tamanho={20} />
                <b>{c.termo}</b>
              </span>
              <small className="inspiracao-abrir">Ver ideias no Pinterest<Icone nome="seta" tamanho={14} /></small>
            </a>
          ))}
        </div>
      )}
      {personalizando && (
        <Modal titulo="Personalizar inspirações" aoFechar={() => setPersonalizando(false)}>
          <p className="suave">Cole o link de uma pasta pública do Pinterest. As imagens dela passam a aparecer no painel de inspirações.</p>
          <label className="campo">Link da pasta
            <input type="url" value={link} placeholder="https://br.pinterest.com/seu-usuario/acustica/" onChange={(e) => setLink(e.target.value.trim())} />
          </label>
          {link && !PASTA.test(link) && <p className="erro">O link deve ser de uma pasta, no formato pinterest.com/usuário/pasta.</p>}
          <p className="nota">Para copiar o link, abra a pasta no Pinterest e use Compartilhar › Copiar link. Entrar com a conta do Pinterest para escolher a pasta em uma lista vem junto com o login da comunidade.</p>
          <div className="linha acoes">
            <button type="button" className="btn primario" disabled={!PASTA.test(link)} onClick={() => { mudarPerfil({ ...perfil, pinterest: link }); setPersonalizando(false) }}><Icone nome="ok" />Usar esta pasta</button>
            {perfil.pinterest && <button type="button" className="btn secundario" onClick={() => { mudarPerfil({ ...perfil, pinterest: '' }); setPersonalizando(false) }}>Voltar às sugestões</button>}
            <button type="button" className="btn fantasma" onClick={() => setPersonalizando(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
