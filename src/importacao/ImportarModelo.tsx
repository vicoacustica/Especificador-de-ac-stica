import { useMemo, useRef, useState } from 'react'
import type { Catalogo } from '../motor/materiais'
import type { Cenario, Superficie } from '../motor/tipos'
import { Icone } from '../ui/Icone'
import { Modal } from '../ui/Modal'
import { fmt } from '../ui/formato'
import { aplicarImportacao, sugerirDestino } from './aplicar'
import { CORES_LAYER, ESCALA, lerDXF, lerOBJ, NOME_ORIENTACAO, NOME_UNIDADE, objTemMateriais, quadroDeAreas, unidadeProvavel, type Modelo, type Orientacao, type Unidade } from './modelo'
import { PreviaModelo } from './PreviaModelo'

const ORIENTACOES: Orientacao[] = ['piso', 'parede', 'teto', 'inclinada']

interface Arquivo { nome: string; texto: string; formato: 'DXF' | 'OBJ' }

export interface ResultadoImportacao {
  arquivo: string
  superficies: Superficie[]
  volume?: number
  peDireito?: number
}

interface Props {
  cenario: Cenario
  catalogo: Catalogo
  aoImportar: (r: ResultadoImportacao) => void
  aoFechar: () => void
}

/**
 * Importação de DXF ou OBJ. Antes de importar mostra a prévia 3D e todas as layers (ou grupos)
 * com a área de cada orientação. O tipo e o material de cada superfície se ajustam depois.
 */
export function ImportarModelo({ cenario, catalogo, aoImportar, aoFechar }: Props) {
  const entrada = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<Arquivo | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [agrupar, setAgrupar] = useState<'grupo' | 'material'>('grupo')
  const [unidade, setUnidade] = useState<Unidade | null>(null)
  const [separar, setSeparar] = useState(false)
  const [substituir, setSubstituir] = useState(true)
  const [vaos, setVaos] = useState(true)
  const [volume, setVolume] = useState<'manter' | 'caixa' | 'faces' | null>(null)
  const [usarAltura, setUsarAltura] = useState(true)
  const [destaque, setDestaque] = useState<string | null>(null)

  const modelo = useMemo<Modelo | null>(() => {
    if (!arquivo) return null
    return arquivo.formato === 'DXF' ? lerDXF(arquivo.texto) : lerOBJ(arquivo.texto, agrupar)
  }, [arquivo, agrupar])
  const un = unidade ?? (modelo ? unidadeProvavel(modelo) : 'm')
  const quadro = useMemo(() => (modelo?.faces.length ? quadroDeAreas(modelo, un, separar) : null), [modelo, un, separar])
  const layers = useMemo(() => (quadro ? [...new Set(quadro.linhas.map((l) => l.layer))] : []), [quadro])
  const corDe = (layer: string) => CORES_LAYER[layers.indexOf(layer) % CORES_LAYER.length]

  // Volume pelas faces só é confiável quando não passa da caixa: acima dela há superfícies internas ou o modelo está aberto.
  const facesConfiaveis = !!quadro && quadro.volumeFaces > 0.3 * quadro.volumeCaixa && quadro.volumeFaces <= quadro.volumeCaixa * 1.001
  const origemVolume = volume ?? (facesConfiaveis ? 'faces' : 'caixa')
  const altura = quadro ? quadro.caixa.max[2] - quadro.caixa.min[2] : 0

  async function abrir(f: File | undefined) {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (ext !== 'dxf' && ext !== 'obj') { setErro('Use um arquivo .dxf ou .obj.'); return }
    if (f.size > 80 * 1024 * 1024) { setErro('O arquivo passa de 80 MB. Exporte só o ambiente que será avaliado.'); return }
    const texto = await f.text()
    if (ext === 'dxf' && !/^\s*0\s*\r?\n\s*SECTION/m.test(texto)) { setErro('Este DXF parece ser binário. Exporte o DXF em formato ASCII (texto).'); return }
    setErro(null)
    setUnidade(null)
    setVolume(null)
    setAgrupar('grupo')
    setArquivo({ nome: f.name, texto, formato: ext === 'dxf' ? 'DXF' : 'OBJ' })
  }

  async function abrirExemplo(ext: 'dxf' | 'obj') {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}exemplos/sala-de-aula.${ext}`)
      if (!r.ok) throw new Error(String(r.status))
      await abrir(new File([await r.text()], `sala-de-aula.${ext}`))
    } catch {
      setErro('Não foi possível abrir o exemplo. Baixe o arquivo e escolha-o aqui.')
    }
  }

  function importar() {
    if (!quadro || !arquivo) return
    const escolhas = quadro.linhas.map((linha) => ({ linha, destino: sugerirDestino(linha) }))
    const r = aplicarImportacao(cenario, escolhas, { substituir, vaosRecortados: vaos }, catalogo)
    if ('erro' in r) { setErro(r.erro); return }
    const v = origemVolume === 'caixa' ? quadro.volumeCaixa : origemVolume === 'faces' ? quadro.volumeFaces : undefined
    aoImportar({
      arquivo: arquivo.nome,
      superficies: r.superficies,
      volume: v ? Math.round(v * 10) / 10 : undefined,
      peDireito: usarAltura && altura > 0 ? Math.round(altura * 100) / 100 : undefined,
    })
  }

  const somas = quadro ? ORIENTACOES.map((o) => quadro.linhas.reduce((a, l) => a + l.areas[o], 0)) : []
  const ignoradas = modelo ? Object.entries(modelo.ignoradas) : []
  const dim = quadro ? [0, 1, 2].map((k) => quadro.caixa.max[k] - quadro.caixa.min[k]) : []
  const nomeGrupos = separar ? 'linhas' : arquivo?.formato === 'OBJ' ? (agrupar === 'grupo' ? 'grupos' : 'materiais') : 'layers'

  return (
    <Modal titulo="Importar modelo" aoFechar={aoFechar} largo>
      <input ref={entrada} type="file" accept=".dxf,.obj" hidden onChange={(e) => { abrir(e.target.files?.[0]); e.target.value = '' }} />
      {!arquivo && (
        <div className="importar-inicio">
          <button type="button" className="importar-soltar" onClick={() => entrada.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); abrir(e.dataTransfer.files[0]) }}>
            <Icone nome="enviar" tamanho={26} />
            <b>Escolha ou arraste um arquivo DXF ou OBJ</b>
            <span className="suave">O sistema lê as faces do modelo, separa por layer e mostra a prévia 3D e as áreas antes de importar.</span>
          </button>
          <p className="importar-exemplo suave">Para experimentar, use a sala de aula do guia (9 × 7 × 3 m):
            <button type="button" className="btn fantasma pequeno" onClick={() => abrirExemplo('dxf')}>Abrir exemplo DXF</button>
            <button type="button" className="btn fantasma pequeno" onClick={() => abrirExemplo('obj')}>Abrir exemplo OBJ</button>
            <a className="btn fantasma pequeno" href={`${import.meta.env.BASE_URL}exemplos/sala-de-aula.dxf`} download>Baixar DXF</a>
          </p>
          <ul className="importar-dicas">
            <li><b>DXF 3D:</b> faces 3D (3DFACE) e malhas (polyface mesh), como exporta o SketchUp. Blocos são lidos com a posição, a escala e a rotação. Exporte em ASCII.</li>
            <li><b>DXF 2D:</b> polilinhas fechadas viram áreas de piso. Informe as paredes depois, na etapa de superfícies.</li>
            <li><b>OBJ:</b> as faces ficam agrupadas pelos grupos ou pelos materiais do modelo. SketchUp, Revit, Rhino e Blender exportam OBJ.</li>
            <li>Modele só o ambiente avaliado, com cada material numa layer (ou etiqueta) e portas e janelas em layers próprias.</li>
          </ul>
        </div>
      )}

      {arquivo && modelo && !quadro && (
        <p className="erro">Nenhuma face encontrada em “{arquivo.nome}”.{ignoradas.length ? ` O arquivo tem ${ignoradas.map(([t, n]) => `${n} ${t}`).join(', ')}, que não são lidos. Exporte as superfícies como faces 3D ou malha.` : ' Verifique se o modelo tem faces 3D ou polilinhas fechadas.'}
          <button type="button" className="btn fantasma pequeno" onClick={() => setArquivo(null)}>Escolher outro arquivo</button>
        </p>
      )}

      {arquivo && modelo && quadro && (
        <div className="importar">
          <div className="importar-resumo">
            <span><Icone nome="ok" tamanho={16} /><b>{arquivo.nome}</b> · {modelo.formato} · {modelo.faces.length} faces · {quadro.linhas.length} {nomeGrupos}</span>
            <span className="suave">Caixa envolvente {dim.map((d) => fmt(d)).join(' × ')} m</span>
          </div>

          <PreviaModelo modelo={modelo} unidade={un} layers={layers} destaque={destaque} />

          <div className="linha importar-opcoes">
            <label className="campo">Unidade do desenho
              <select value={un} onChange={(e) => setUnidade(e.target.value as Unidade)}>
                {(Object.keys(ESCALA) as Unidade[]).map((u) => <option key={u} value={u}>{NOME_UNIDADE[u]}</option>)}
              </select>
              <small className="nota">{modelo.unidade ? 'Declarada no arquivo.' : 'Estimada pelo tamanho do modelo. Confira as medidas da caixa.'}</small>
            </label>
            {arquivo.formato === 'OBJ' && objTemMateriais(arquivo.texto) && (
              <label className="campo">Agrupar faces por
                <select value={agrupar} onChange={(e) => setAgrupar(e.target.value as 'grupo' | 'material')}>
                  <option value="grupo">Grupo ou objeto</option>
                  <option value="material">Material</option>
                </select>
              </label>
            )}
            <label className="marcar"><input type="checkbox" checked={separar} onChange={(e) => setSeparar(e.target.checked)} /> Separar cada layer por orientação</label>
          </div>

          <div className="tabela-rolagem">
            <table className="quadro-areas">
              <thead>
                <tr>
                  <th>Layer</th>
                  <th className="num">Faces</th>
                  {ORIENTACOES.map((o) => <th key={o} className="num">{NOME_ORIENTACAO[o]}</th>)}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody onMouseLeave={() => setDestaque(null)}>
                {quadro.linhas.map((l) => (
                  <tr key={l.chave} className={destaque === l.layer ? 'destacada' : undefined} onMouseEnter={() => setDestaque(l.layer)}>
                    <td><i className="sw" style={{ background: corDe(l.layer) }} /><b>{l.chave}</b></td>
                    <td className="num">{l.faces}</td>
                    {ORIENTACOES.map((o) => <td key={o} className="num">{l.areas[o] > 0.005 ? fmt(l.areas[o]) : '·'}</td>)}
                    <td className="num"><b>{fmt(l.total)}</b></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{quadro.linhas.reduce((a, l) => a + l.faces, 0)}</td>
                  {somas.map((s, k) => <td key={k} className="num">{fmt(s)}</td>)}
                  <td className="num">{fmt(quadro.areaTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="nota">Áreas em m². Passe o mouse numa layer para destacá-la na prévia. Faces com até 20° de inclinação são horizontais: abaixo da metade da altura do modelo contam como piso, acima como forro/teto. Faces a partir de 70° são paredes; entre esses ângulos, inclinadas.</p>
          {ignoradas.length > 0 && <p className="alerta">O arquivo também tem {ignoradas.map(([t, n]) => `${n} ${t}`).join(', ')}, que não entram no quadro. Para incluí-los, exporte essas superfícies como faces 3D ou malha.</p>}

          <div className="importar-opcoes-finais">
            <label className="campo">Volume (V) do ambiente
              <select value={origemVolume} onChange={(e) => setVolume(e.target.value as 'manter' | 'caixa' | 'faces')}>
                <option value="faces">Pelas faces do modelo: {fmt(quadro.volumeFaces, 1)} m³ (modelo fechado, sem superfícies internas)</option>
                <option value="caixa">Pela caixa envolvente: {fmt(quadro.volumeCaixa, 1)} m³</option>
                <option value="manter">Manter o informado ({fmt(cenario.volume, 1)} m³)</option>
              </select>
            </label>
            <label className="marcar"><input type="checkbox" checked={usarAltura} onChange={(e) => setUsarAltura(e.target.checked)} /> Usar a altura do modelo como pé-direito (h): {fmt(altura)} m</label>
            <label className="marcar"><input type="checkbox" checked={vaos} onChange={(e) => setVaos(e.target.checked)} /> As paredes do modelo já têm os vãos de portas e janelas recortados (a área das esquadrias volta para a parede base)</label>
            <label className="marcar"><input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} /> Substituir as superfícies atuais do cenário “{cenario.nome}”</label>
          </div>
          <p className="nota">Cada layer vira uma superfície com o nome da layer. O tipo inicial vem do nome e da orientação das faces, e o material é o padrão do tipo. Depois de importar, ajuste o tipo e o material de cada uma na etapa de superfícies.</p>
          {erro && <p className="erro" role="alert">{erro}</p>}
          <div className="linha acoes">
            <button type="button" className="btn primario" onClick={importar}><Icone nome="ok" />Importar {quadro.linhas.length} {quadro.linhas.length === 1 ? 'superfície' : 'superfícies'}</button>
            <button type="button" className="btn secundario" onClick={() => entrada.current?.click()}>Escolher outro arquivo</button>
            <button type="button" className="btn fantasma" onClick={aoFechar}>Cancelar</button>
          </div>
        </div>
      )}
      {!quadro && erro && <p className="erro" role="alert">{erro}</p>}
    </Modal>
  )
}
