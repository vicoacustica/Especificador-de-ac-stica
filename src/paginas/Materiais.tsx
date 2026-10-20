import { useState } from 'react'
import { nomeCategoria, type Catalogo } from '../motor/materiais'
import type { Material, Projeto } from '../motor/tipos'
import { EditorMaterial, type SalvarMaterial } from '../ui/EditorMaterial'
import { fmt } from '../ui/formato'
import { Icone } from '../ui/Icone'
import { BarrasAlfa, MiniaturaMaterial } from '../ui/MaterialVisual'

type Filtro = 'todos' | 'planilha' | 'meus' | 'imagem'
const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'planilha', rotulo: 'Base da planilha' },
  { valor: 'meus', rotulo: 'Meus materiais' },
  { valor: 'imagem', rotulo: 'Com imagem' },
]
const PAGINA = 60

interface Props {
  catalogo: Catalogo
  projetos: Projeto[]
  salvarMaterial: (s: SalvarMaterial) => void
  excluirMaterial: (id: string) => void
}

/** Projetos que usam o material em alguma superfície ou item. */
function usosDoMaterial(id: string, projetos: Projeto[]): string[] {
  return projetos
    .filter((p) => p.cenarios.some((c) => c.superficies.some((s) => s.material === id) || c.itens.some((it) => it.material === id || it.materialOcupado === id)))
    .map((p) => p.nome)
}

export function Materiais({ catalogo, projetos, salvarMaterial, excluirMaterial }: Props) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [categoria, setCategoria] = useState('todas')
  const [limite, setLimite] = useState(PAGINA)
  const [editando, setEditando] = useState<Material | 'novo' | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  const termo = busca.trim().toLowerCase()
  const doFiltro = catalogo.todos.filter((m) =>
    filtro === 'planilha' ? !m.proprio : filtro === 'meus' ? m.proprio : filtro === 'imagem' ? !!m.imagem : true)
  const categorias = [...new Set(doFiltro.map((m) => m.tipo))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const lista = doFiltro.filter((m) => (categoria === 'todas' || m.tipo === categoria) && (!termo || m.nome.toLowerCase().includes(termo)))
  const mudar = (f: () => void) => { f(); setLimite(PAGINA); setExcluindo(null) }

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div className="cabecalho-texto">
          <h1>Biblioteca de materiais</h1>
          <p>{catalogo.todos.length} materiais: a base da PLANILHA_TR e os que você criou. Envie fotos dos acabamentos para reconhecer cada material na hora da escolha.</p>
        </div>
        <div className="cabecalho-acoes">
          <button type="button" className="btn primario" onClick={() => setEditando('novo')}><Icone nome="mais" />Novo material</button>
        </div>
      </header>

      <div className="filtros">
        <div className="busca">
          <Icone nome="busca" />
          <input type="search" placeholder="Buscar por nome ou fabricante (ex.: SONEX, AMBI, ECOPHON)" value={busca} onChange={(e) => mudar(() => setBusca(e.target.value))} />
        </div>
        <div className="seg" role="group" aria-label="Origem">
          {FILTROS.map((f) => (
            <button key={f.valor} type="button" aria-pressed={filtro === f.valor} onClick={() => mudar(() => { setFiltro(f.valor); setCategoria('todas') })}>{f.rotulo}</button>
          ))}
        </div>
      </div>
      <div className="chips rolagem">
        <button type="button" className="chip" aria-pressed={categoria === 'todas'} onClick={() => mudar(() => setCategoria('todas'))}>Todas <span className="contagem">{doFiltro.length}</span></button>
        {categorias.map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={categoria === c} onClick={() => mudar(() => setCategoria(c))}>
            {nomeCategoria(c)} <span className="contagem">{doFiltro.filter((m) => m.tipo === c).length}</span>
          </button>
        ))}
      </div>

      <div className="grade-biblioteca">
        {lista.slice(0, limite).map((m) => {
          const usos = excluindo === m.id ? usosDoMaterial(m.id, projetos) : []
          return (
            <article key={m.id} className="cartao-biblioteca">
              <button type="button" className="cartao-biblioteca-imagem" aria-label={`Abrir ${m.nome}`} onClick={() => setEditando(m)}>
                <MiniaturaMaterial material={m} />
                <span className="selo">{m.proprio ? 'Meu material' : 'Planilha'}</span>
              </button>
              <div className="cartao-biblioteca-corpo">
                <b>{m.nome}</b>
                <span className="suave">{nomeCategoria(m.tipo)}</span>
                <div className="cartao-biblioteca-alfa">
                  <BarrasAlfa alfa={m.alfa} unidade={m.unidade} />
                  <span className="mono">{m.unidade ? 'A por peça' : 'α'} 500 Hz: {fmt(m.alfa[2])}</span>
                </div>
                {excluindo === m.id ? (
                  usos.length ? (
                    <p className="erro">Em uso em {usos.join(', ')}. Troque o material nesses projetos antes de excluir.
                      <button type="button" className="btn fantasma pequeno" onClick={() => setExcluindo(null)}>Entendi</button>
                    </p>
                  ) : (
                    <span className="confirmar">Excluir?
                      <button type="button" className="btn perigo pequeno" onClick={() => { excluirMaterial(m.id); setExcluindo(null) }}>Excluir</button>
                      <button type="button" className="btn fantasma pequeno" onClick={() => setExcluindo(null)}>Cancelar</button>
                    </span>
                  )
                ) : (
                  <div className="linha">
                    <button type="button" className="btn secundario pequeno" onClick={() => setEditando(m)}>
                      <Icone nome={m.proprio ? 'editar' : 'imagem'} tamanho={16} />{m.proprio ? 'Editar' : m.imagem ? 'Trocar imagem' : 'Enviar imagem'}
                    </button>
                    {m.proprio && <button type="button" className="icone-btn" aria-label={`Excluir ${m.nome}`} onClick={() => setExcluindo(m.id)}><Icone nome="lixo" /></button>}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
      {lista.length > limite && (
        <div className="mais-itens">
          <span className="nota">Mostrando {limite} de {lista.length}</span>
          <button type="button" className="btn secundario" onClick={() => setLimite(limite + PAGINA)}>Mostrar mais</button>
        </div>
      )}
      {!lista.length && (
        <div className="vazio">
          <b>{filtro === 'meus' ? 'Você ainda não criou materiais' : filtro === 'imagem' ? 'Nenhum material com imagem' : 'Nenhum material encontrado'}</b>
          <span className="suave">{filtro === 'meus' ? 'Crie um material com os seis coeficientes do ensaio do fabricante.' : filtro === 'imagem' ? 'Abra um material e envie a foto do acabamento.' : 'Tente outro nome ou outra categoria.'}</span>
          {filtro === 'meus' && <button type="button" className="btn primario" onClick={() => setEditando('novo')}><Icone nome="mais" />Novo material</button>}
        </div>
      )}

      {editando && (
        <EditorMaterial
          catalogo={catalogo}
          material={editando === 'novo' ? undefined : editando}
          aoSalvar={(s) => { salvarMaterial(s); setEditando(null) }}
          aoFechar={() => setEditando(null)}
        />
      )}
    </div>
  )
}
