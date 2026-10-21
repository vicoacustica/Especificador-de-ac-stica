import { useState } from 'react'
import type { Projeto } from '../motor/tipos'
import { Icone } from '../ui/Icone'
import { CartaoProjeto } from './CartaoProjeto'

interface Props {
  projetos: Projeto[]
  abrir: (id: string) => void
  novo: () => void
  duplicar: (p: Projeto) => void
  excluir: (id: string) => void
}

export function Projetos({ projetos, abrir, novo, duplicar, excluir }: Props) {
  const [busca, setBusca] = useState('')
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const termo = busca.trim().toLowerCase()
  const lista = projetos
    .filter((p) => !termo || p.nome.toLowerCase().includes(termo))
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div className="cabecalho-texto">
          <h1>Projetos</h1>
          <p>Cada projeto reúne os cenários de uma sala. Abra um projeto para editar ou comparar as alternativas.</p>
        </div>
        <div className="cabecalho-acoes">
          <button type="button" className="btn primario" onClick={novo}><Icone nome="mais" />Novo projeto</button>
        </div>
      </header>
      <div className="busca">
        <Icone nome="busca" />
        <input type="search" placeholder="Buscar projeto pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <div className="grade-projetos">
        {lista.map((p) => (
          <CartaoProjeto
            key={p.id}
            projeto={p}
            abrir={() => abrir(p.id)}
            acoes={excluindo === p.id ? (
              <span className="confirmar">Excluir este projeto?
                <button type="button" className="btn perigo pequeno" onClick={() => { excluir(p.id); setExcluindo(null) }}>Excluir</button>
                <button type="button" className="btn fantasma pequeno" onClick={() => setExcluindo(null)}>Cancelar</button>
              </span>
            ) : (
              <>
                <button type="button" className="btn fantasma pequeno" onClick={() => duplicar(p)}><Icone nome="copiar" tamanho={16} />Duplicar</button>
                <button type="button" className="btn fantasma pequeno" onClick={() => setExcluindo(p.id)}><Icone nome="lixo" tamanho={16} />Excluir</button>
              </>
            )}
          />
        ))}
        <button type="button" className="cartao-novo" onClick={novo}>
          <span className="cartao-novo-icone"><Icone nome="mais" tamanho={22} /></span>
          <b>Novo projeto</b>
          <span className="suave">Comece pelo ambiente: uso, volume e umidade.</span>
        </button>
      </div>
      {!lista.length && termo && <p className="suave">Nenhum projeto com esse nome.</p>}
      <p className="nota">Os projetos ficam salvos neste navegador. O login da comunidade, com projetos na nuvem, entra em uma próxima versão.</p>
    </div>
  )
}
