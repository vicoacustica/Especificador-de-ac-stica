import { useEffect, useMemo, useState } from 'react'
import { Catalogo } from './motor/materiais'
import type { Projeto } from './motor/tipos'
import { cenarioVazio, duplicarCenario, novoId, projetoExemplo } from './dados/exemplo'
import { RepositorioLocal } from './dados/projetos'
import { lerBiblioteca, lerPerfil, salvarBiblioteca, salvarPerfil, type Biblioteca, type Perfil } from './dados/conta'
import { Ajuda, type AbaAjuda } from './paginas/Ajuda'
import { Conta } from './paginas/Conta'
import { Editor } from './paginas/Editor'
import { Inicio } from './paginas/Inicio'
import { Materiais } from './paginas/Materiais'
import { Projetos } from './paginas/Projetos'
import type { SalvarMaterial } from './ui/EditorMaterial'
import { Icone, type NomeIcone } from './ui/Icone'
import { DadosProjeto } from './ui/DadosProjeto'
import { iniciais } from './ui/formato'

const repositorio = new RepositorioLocal()

type Rota =
  | { pagina: 'inicio' | 'projetos' | 'materiais' | 'conta' }
  | { pagina: 'ajuda'; aba?: AbaAjuda }
  | { pagina: 'projeto'; id: string }

const MENU: { pagina: 'inicio' | 'projetos' | 'materiais' | 'ajuda'; titulo: string; icone: NomeIcone }[] = [
  { pagina: 'inicio', titulo: 'Início', icone: 'inicio' },
  { pagina: 'projetos', titulo: 'Projetos', icone: 'projetos' },
  { pagina: 'materiais', titulo: 'Materiais', icone: 'materiais' },
  { pagina: 'ajuda', titulo: 'Ajuda', icone: 'ajuda' },
]

function projetosIniciais(): Projeto[] {
  const salvos = repositorio.listar()
  if (salvos.length) return salvos
  const exemplo = projetoExemplo()
  repositorio.salvar(exemplo)
  return [exemplo]
}

/** Materiais criados dentro de projetos (versão anterior) passam para a biblioteca da conta. */
function bibliotecaInicial(): Biblioteca {
  const b = lerBiblioteca()
  const legado = repositorio.listar().flatMap((p) => p.materiaisProprios).filter((m) => !b.proprios.some((x) => x.id === m.id))
  return legado.length ? { ...b, proprios: [...b.proprios, ...legado] } : b
}

export default function App() {
  const [projetos, setProjetos] = useState<Projeto[]>(projetosIniciais)
  const [biblioteca, setBiblioteca] = useState<Biblioteca>(bibliotecaInicial)
  const [perfil, setPerfil] = useState<Perfil>(lerPerfil)
  const [rota, setRota] = useState<Rota>({ pagina: 'inicio' })
  const [aviso, setAviso] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  const projeto = rota.pagina === 'projeto' ? projetos.find((p) => p.id === rota.id) : undefined
  const catalogo = useMemo(
    () => new Catalogo([...biblioteca.proprios, ...(projeto?.materiaisProprios ?? [])], biblioteca.imagens),
    [biblioteca, projeto?.materiaisProprios],
  )

  useEffect(() => { window.scrollTo({ top: 0 }) }, [rota])
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 5000)
    return () => clearTimeout(t)
  }, [aviso])

  function ir(r: Rota) { setRota(r) }

  function mudarProjeto(id: string, f: (p: Projeto) => void) {
    setProjetos((lista) => lista.map((p) => {
      if (p.id !== id) return p
      const copia = structuredClone(p)
      f(copia)
      copia.atualizadoEm = new Date().toISOString()
      if (!repositorio.salvar(copia)) setAviso('O navegador não tem mais espaço para salvar este projeto. Remova imagens de projetos ou materiais para liberar espaço.')
      return copia
    }))
  }
  function novoProjeto() { setCriando(true) }
  function criarProjeto(nome: string, imagem: string | undefined) {
    setCriando(false)
    const p: Projeto = { id: novoId(), nome, imagem, cenarios: [cenarioVazio('Cenário 1')], materiaisProprios: [], atualizadoEm: new Date().toISOString() }
    if (!repositorio.salvar(p)) setAviso('O navegador não tem mais espaço para salvar este projeto. Remova imagens de projetos ou materiais para liberar espaço.')
    setProjetos((l) => [p, ...l])
    ir({ pagina: 'projeto', id: p.id })
  }
  function duplicarProjeto(p: Projeto) {
    const n: Projeto = { ...structuredClone(p), id: novoId(), nome: `${p.nome} (cópia)`, cenarios: p.cenarios.map((c) => duplicarCenario(c, c.nome)), atualizadoEm: new Date().toISOString() }
    repositorio.salvar(n)
    setProjetos((l) => [n, ...l])
  }
  function excluirProjeto(id: string) {
    repositorio.excluir(id)
    setProjetos((l) => l.filter((p) => p.id !== id))
  }

  function gravarBiblioteca(b: Biblioteca) {
    setBiblioteca(b)
    if (!salvarBiblioteca(b)) setAviso('O navegador não tem mais espaço para salvar a biblioteca. Remova algumas imagens para liberar espaço.')
  }
  function salvarMaterial({ material, imagem }: SalvarMaterial) {
    const proprios = material.proprio
      ? [...biblioteca.proprios.filter((m) => m.id !== material.id), { ...material, imagem: undefined }]
      : biblioteca.proprios
    const imagens = { ...biblioteca.imagens }
    if (typeof imagem === 'string') imagens[material.id] = imagem
    else if (imagem === null) delete imagens[material.id]
    gravarBiblioteca({ proprios, imagens })
    setAviso(`“${material.nome}” salvo na sua biblioteca.`)
  }
  function excluirMaterial(id: string) {
    const imagens = { ...biblioteca.imagens }
    delete imagens[id]
    gravarBiblioteca({ proprios: biblioteca.proprios.filter((m) => m.id !== id), imagens })
  }
  function mudarPerfil(p: Perfil) {
    setPerfil(p)
    if (!salvarPerfil(p)) setAviso('Não foi possível salvar o perfil neste navegador.')
  }
  function apagarDados() {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('especificador:')) localStorage.removeItem(k)
    } catch { /* armazenamento bloqueado: só reinicia a tela */ }
    setPerfil(lerPerfil())
    setBiblioteca(bibliotecaInicial())
    setProjetos(projetosIniciais())
    ir({ pagina: 'inicio' })
    setAviso('Os dados deste navegador foram apagados.')
  }

  const ativa = rota.pagina === 'projeto' ? 'projetos' : rota.pagina
  let conteudo
  if (rota.pagina === 'projeto' && projeto) {
    conteudo = (
      <Editor
        key={projeto.id}
        projeto={projeto}
        catalogo={catalogo}
        mudarProjeto={(f) => mudarProjeto(projeto.id, f)}
        salvarMaterial={salvarMaterial}
        voltar={() => ir({ pagina: 'projetos' })}
        abrirAjuda={() => ir({ pagina: 'ajuda' })}
      />
    )
  } else if (rota.pagina === 'projetos' || rota.pagina === 'projeto') {
    conteudo = <Projetos projetos={projetos} catalogo={catalogo} abrir={(id) => ir({ pagina: 'projeto', id })} novo={novoProjeto} duplicar={duplicarProjeto} excluir={excluirProjeto} />
  } else if (rota.pagina === 'materiais') {
    conteudo = <Materiais catalogo={catalogo} projetos={projetos} salvarMaterial={salvarMaterial} excluirMaterial={excluirMaterial} />
  } else if (rota.pagina === 'ajuda') {
    conteudo = <Ajuda aba={rota.aba ?? 'guia'} mudarAba={(aba) => ir({ pagina: 'ajuda', aba })} />
  } else if (rota.pagina === 'conta') {
    conteudo = <Conta perfil={perfil} mudarPerfil={mudarPerfil} biblioteca={biblioteca} projetos={projetos} apagarDados={apagarDados} />
  } else {
    conteudo = (
      <Inicio
        perfil={perfil}
        mudarPerfil={mudarPerfil}
        projetos={projetos}
        catalogo={catalogo}
        biblioteca={biblioteca}
        abrir={(id) => ir({ pagina: 'projeto', id })}
        novo={novoProjeto}
        ir={(pagina, aba) => ir(pagina === 'ajuda' ? { pagina, aba } : { pagina })}
      />
    )
  }

  return (
    <div className="app">
      <header className="barra">
        <button type="button" className="marca" onClick={() => ir({ pagina: 'inicio' })}>
          <span className="marca-simbolo"><Icone nome="onda" tamanho={18} /></span>
          <span>Especificador<small>Viço Acústica</small></span>
        </button>
        <nav className="menu" aria-label="Seções">
          {MENU.map((m) => (
            <button key={m.pagina} type="button" className="pilula" aria-current={ativa === m.pagina ? 'page' : undefined} onClick={() => ir({ pagina: m.pagina })}>
              <Icone nome={m.icone} /><span>{m.titulo}</span>
            </button>
          ))}
        </nav>
        <div className="barra-conta">
          <button type="button" className="icone-btn redondo" aria-label="Configurações e ajuda" onClick={() => ir({ pagina: 'ajuda', aba: 'guia' })}><Icone nome="ajustes" /></button>
          <button type="button" className="avatar" aria-label="Minha conta" aria-current={ativa === 'conta' ? 'page' : undefined} onClick={() => ir({ pagina: 'conta' })}>{iniciais(perfil.nome)}</button>
        </div>
      </header>
      <div className="conteudo">{conteudo}</div>
      {criando && <DadosProjeto titulo="Novo projeto" acao="Criar projeto" aoSalvar={criarProjeto} aoFechar={() => setCriando(false)} />}
      {aviso && <div className="aviso" role="status">{aviso}<button type="button" className="icone-btn" aria-label="Fechar aviso" onClick={() => setAviso(null)}><Icone nome="fechar" tamanho={16} /></button></div>}
    </div>
  )
}
