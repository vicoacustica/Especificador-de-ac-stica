import { useState } from 'react'
import type { Projeto } from '../motor/tipos'
import type { Biblioteca, Perfil } from '../dados/conta'
import { Texto } from '../ui/campos'
import { iniciais } from '../ui/formato'
import { Icone } from '../ui/Icone'

interface Props {
  perfil: Perfil
  mudarPerfil: (p: Perfil) => void
  biblioteca: Biblioteca
  projetos: Projeto[]
  apagarDados: () => void
}

const CAMPOS: { chave: Exclude<keyof Perfil, 'pinterest'>; rotulo: string; exemplo: string }[] = [
  { chave: 'nome', rotulo: 'Nome', exemplo: 'Seu nome completo' },
  { chave: 'email', rotulo: 'E-mail', exemplo: 'voce@empresa.com.br' },
  { chave: 'empresa', rotulo: 'Empresa ou escritório', exemplo: 'ex.: Viço Acústica' },
  { chave: 'profissao', rotulo: 'Profissão', exemplo: 'ex.: Arquiteta, engenheiro acústico' },
  { chave: 'registro', rotulo: 'Cadastro profissional', exemplo: 'ex.: CAU A123456-7 ou CREA 123456/D' },
]

/** Tamanho aproximado do que este app guarda no navegador, em kB. */
function espacoUsado(): number {
  try {
    return Math.round(Object.keys(localStorage).filter((k) => k.startsWith('especificador:')).reduce((n, k) => n + (localStorage.getItem(k)?.length ?? 0), 0) / 512)
  } catch {
    return 0
  }
}

export function Conta({ perfil, mudarPerfil, biblioteca, projetos, apagarDados }: Props) {
  const [confirmar, setConfirmar] = useState(false)
  return (
    <div className="pagina">
      <header className="cabecalho">
        <div className="cabecalho-texto">
          <h1>Minha conta</h1>
          <p>Seus dados de perfil e o que está guardado neste navegador.</p>
        </div>
      </header>
      <div className="grade-conta">
        <section className="bloco">
          <div className="perfil-linha">
            <span className="avatar grande">{iniciais(perfil.nome)}</span>
            <span><b>{perfil.nome || 'Sem nome'}</b><span className="suave">{perfil.email || 'Sem e-mail'}</span></span>
          </div>
          <div className="formulario">
            {CAMPOS.map((c) => (
              <label key={c.chave} className="campo">{c.rotulo}
                <Texto valor={perfil[c.chave]} placeholder={c.exemplo} aoMudar={(v) => mudarPerfil({ ...perfil, [c.chave]: v.trim() })} />
              </label>
            ))}
          </div>
          <p className="nota">As alterações são salvas quando você sai do campo.</p>
        </section>
        <div className="coluna">
          <section className="bloco escuro">
            <h2>Login da comunidade</h2>
            <p>Em breve você vai entrar com a conta da comunidade Viço Acústica e encontrar seus projetos e materiais em qualquer computador.</p>
          </section>
          <section className="bloco">
            <h2>Dados neste navegador</h2>
            <div className="numeros compacto">
              <div><small>Projetos</small><b>{projetos.length}</b></div>
              <div><small>Meus materiais</small><b>{biblioteca.proprios.length}</b></div>
              <div><small>Imagens</small><b>{Object.keys(biblioteca.imagens).length}</b></div>
              <div><small>Espaço usado</small><b>{espacoUsado()} kB</b></div>
            </div>
            <p className="nota">O navegador reserva em torno de 5 MB para o site. As imagens são reduzidas para cerca de 30 kB cada.</p>
            {confirmar ? (
              <span className="confirmar">Apagar projetos, materiais, imagens e perfil deste navegador? Isso não pode ser desfeito.
                <button type="button" className="btn perigo pequeno" onClick={apagarDados}>Apagar tudo</button>
                <button type="button" className="btn fantasma pequeno" onClick={() => setConfirmar(false)}>Cancelar</button>
              </span>
            ) : (
              <button type="button" className="btn secundario" onClick={() => setConfirmar(true)}><Icone nome="lixo" />Apagar dados deste navegador</button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
