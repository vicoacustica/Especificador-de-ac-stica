import { NOME_ESTILO, PALETA, type Aparencia, type Estilo } from '../dados/aparencia'
import { Segmentado } from './campos'
import { Icone } from './Icone'

/** Escolha do estilo visual; no estilo Brutalista, também a cor de destaque e o modo claro ou escuro. */
export function EscolhaAparencia({ aparencia, mudar }: { aparencia: Aparencia; mudar: (a: Aparencia) => void }) {
  const grade = aparencia.estilo === 'grade'
  return (
    <div className="aparencia">
      <div className="aparencia-estilos" role="group" aria-label="Estilo visual">
        {(Object.keys(NOME_ESTILO) as Estilo[]).map((e) => (
          <button key={e} type="button" className={`aparencia-estilo ${e}`} aria-pressed={aparencia.estilo === e} onClick={() => mudar({ ...aparencia, estilo: e })}>
            <span className="aparencia-amostra" aria-hidden="true"><i /><i /><i /></span>
            <b>{NOME_ESTILO[e].nome}</b>
            <small>{NOME_ESTILO[e].descricao}</small>
          </button>
        ))}
      </div>
      <div className="aparencia-linha">
        <span className="suave">Modo</span>
        {grade ? (
          <Segmentado rotulo="Modo claro ou escuro" valor={aparencia.tema} aoMudar={(tema) => mudar({ ...aparencia, tema })} opcoes={[
            { valor: 'claro', rotulo: <><Icone nome="sol" tamanho={15} />Claro</> },
            { valor: 'escuro', rotulo: <><Icone nome="lua" tamanho={15} />Escuro</> },
          ]} />
        ) : <span className="nota">O modo escuro e a cor de destaque são do estilo Brutalista.</span>}
      </div>
      {grade && (
        <div className="aparencia-linha">
          <span className="suave">Cor de destaque</span>
          <div className="paleta" role="radiogroup" aria-label="Cor de destaque">
            {PALETA.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={aparencia.destaque === p.id} aria-label={p.nome} title={p.nome}
                className="paleta-cor" style={{ background: p.cor, color: p.tinta }} onClick={() => mudar({ ...aparencia, destaque: p.id })}>
                {aparencia.destaque === p.id && <Icone nome="ok" tamanho={16} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
