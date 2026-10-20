import { Icone } from '../ui/Icone'
import { GuiaUsuario } from './GuiaUsuario'
import { ProcessosCalculo } from './ProcessosCalculo'

export type AbaAjuda = 'guia' | 'calculo'

export function Ajuda({ aba, mudarAba }: { aba: AbaAjuda; mudarAba: (a: AbaAjuda) => void }) {
  return (
    <div className="pagina">
      <header className="cabecalho">
        <div className="cabecalho-texto">
          <h1>Ajuda</h1>
          <p>Como usar o especificador e como cada número é calculado.</p>
        </div>
      </header>
      <div className="abas" role="tablist" aria-label="Ajuda">
        <button type="button" role="tab" className="pilula" aria-selected={aba === 'guia'} onClick={() => mudarAba('guia')}><Icone nome="livro" />Guia do usuário</button>
        <button type="button" role="tab" className="pilula" aria-selected={aba === 'calculo'} onClick={() => mudarAba('calculo')}><Icone nome="calculo" />Processos de cálculo</button>
      </div>
      {aba === 'guia' ? <GuiaUsuario /> : <ProcessosCalculo />}
    </div>
  )
}
