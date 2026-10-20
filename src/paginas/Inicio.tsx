import type { Catalogo } from '../motor/materiais'
import type { Projeto } from '../motor/tipos'
import { tipologiaDoProjeto, type Tipologia } from '../dados/ambientes'
import type { Biblioteca, Perfil } from '../dados/conta'
import { iniciais } from '../ui/formato'
import { Icone } from '../ui/Icone'
import { MiniaturaMaterial } from '../ui/MaterialVisual'
import type { AbaAjuda } from './Ajuda'
import { CartaoProjeto } from './CartaoProjeto'
import { Inspiracoes } from './Inspiracoes'

interface Props {
  perfil: Perfil
  mudarPerfil: (p: Perfil) => void
  projetos: Projeto[]
  catalogo: Catalogo
  biblioteca: Biblioteca
  abrir: (id: string) => void
  novo: () => void
  ir: (pagina: 'projetos' | 'materiais' | 'ajuda' | 'conta', aba?: AbaAjuda) => void
}

export function Inicio({ perfil, mudarPerfil, projetos, catalogo, biblioteca, abrir, novo, ir }: Props) {
  const recentes = [...projetos].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)).slice(0, 3)
  const tipologias = [...new Set(recentes.map(tipologiaDoProjeto))] as Tipologia[]
  const primeiroNome = perfil.nome.trim().split(/\s+/)[0]
  const comImagem = catalogo.todos.filter((m) => m.imagem).slice(0, 4)
  const amostra = comImagem.length >= 4 ? comImagem : [...comImagem, ...catalogo.todos.filter((m) => !m.imagem && /PERFURADO|LÃ|ESPUMA|MINERAL/.test(m.tipo)).filter((_, i) => i % 23 === 0)].slice(0, 4)

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div className="cabecalho-texto">
          <h1>{primeiroNome ? `Olá, ${primeiroNome}!` : 'Olá!'}</h1>
          <p>Especifique e dimensione materiais acústicos com critério e desempenho para os seus projetos.</p>
        </div>
        <div className="cabecalho-acoes">
          <button type="button" className="btn secundario" onClick={() => ir('ajuda')}><Icone nome="livro" />Guia do usuário</button>
          <button type="button" className="btn primario" onClick={novo}><Icone nome="mais" />Novo projeto</button>
        </div>
      </header>

      <section className="bloco">
        <div className="bloco-topo">
          <h2>Projetos recentes</h2>
          <button type="button" className="btn fantasma" onClick={() => ir('projetos')}>Ver todos<Icone nome="seta" tamanho={16} /></button>
        </div>
        <div className="grade-projetos">
          {recentes.map((p) => <CartaoProjeto key={p.id} projeto={p} catalogo={catalogo} abrir={() => abrir(p.id)} />)}
          {recentes.length < 3 && (
            <button type="button" className="cartao-novo" onClick={novo}>
              <span className="cartao-novo-icone"><Icone nome="mais" tamanho={22} /></span>
              <b>Novo projeto</b>
              <span className="suave">Dê um nome, envie uma imagem e comece pelo ambiente.</span>
            </button>
          )}
        </div>
      </section>

      <Inspiracoes tipologias={tipologias.length ? tipologias : ['sala-aula']} perfil={perfil} mudarPerfil={mudarPerfil} />

      <div className="grade-inicio">
        <section className="bloco bloco-link">
          <button type="button" className="bloco-botao" onClick={() => ir('materiais')}>
            <span className="bloco-topo"><h2>Biblioteca de materiais</h2><span className="seta-canto"><Icone nome="seta" tamanho={16} /></span></span>
            <span className="suave">Busque na base da planilha, crie seus materiais e envie fotos dos acabamentos.</span>
            <span className="amostras">{amostra.map((m) => <MiniaturaMaterial key={m.id} material={m} tamanho={56} />)}</span>
            <span className="nota">{biblioteca.proprios.length} {biblioteca.proprios.length === 1 ? 'material criado' : 'materiais criados'} · {Object.keys(biblioteca.imagens).length} com imagem enviada</span>
          </button>
        </section>

        <section className="bloco escuro">
          <button type="button" className="bloco-botao" onClick={() => ir('ajuda', 'calculo')}>
            <span className="bloco-topo"><h2>Entenda como o cálculo funciona</h2><span className="seta-canto"><Icone nome="seta" tamanho={16} /></span></span>
            <span className="formula-destaque">T = 0,161·V / A</span>
            <span>Conheça as fórmulas de Sabine e Eyring, a influência dos materiais, do ar e da ocupação na qualidade acústica do seu projeto e os critérios de avaliação das normas NBR 12179 e DIN 18041.</span>
          </button>
        </section>

        <section className="bloco">
          <button type="button" className="bloco-botao" onClick={() => ir('conta')}>
            <span className="bloco-topo"><h2>Minha conta</h2><span className="seta-canto"><Icone nome="seta" tamanho={16} /></span></span>
            <span className="perfil-linha">
              <span className="avatar grande">{iniciais(perfil.nome)}</span>
              <span>
                <b>{perfil.nome || 'Complete seu perfil'}</b>
                <span className="suave">{[perfil.profissao, perfil.empresa].filter(Boolean).join(' · ') || 'Nome, empresa e profissão.'}</span>
              </span>
            </span>
            <span className="nota">Login da comunidade em breve. Por enquanto tudo fica salvo neste navegador.</span>
          </button>
        </section>
      </div>
    </div>
  )
}
