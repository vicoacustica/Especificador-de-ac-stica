import { useMemo, useRef, useState } from 'react'
import wasmIFC from 'web-ifc/web-ifc.wasm?url'
import type { Catalogo } from '../motor/materiais'
import type { Cenario, ModeloProjeto, Superficie } from '../motor/tipos'
import { Icone } from '../ui/Icone'
import { Modal } from '../ui/Modal'
import { fmt } from '../ui/formato'
import { aplicarImportacao, sugerirDestino } from './aplicar'
import { CORES_LAYER, ESCALA, lerDXF, lerOBJ, NOME_ORIENTACAO, NOME_UNIDADE, objTemMateriais, quadroDeAreas, unidadeProvavel, type Modelo, type Orientacao, type Unidade } from './modelo'
import { Visor3D } from './Visor3D'
import { modeloDoEspaco, rotuloEspaco, volumeAssinado, type ArquivoIFC } from './ifc-espaco'

const ORIENTACOES: Orientacao[] = ['piso', 'parede', 'teto', 'inclinada']

interface Arquivo { nome: string; texto: string; formato: 'DXF' | 'OBJ' | 'IFC'; ifc?: ArquivoIFC }

export interface ResultadoImportacao {
  arquivo: string
  superficies: Superficie[]
  modelo: ModeloProjeto
  /** Superfície criada para cada grupo do modelo. */
  grupos: Record<string, string>
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
 * Importação de DXF, OBJ ou IFC. Antes de importar mostra a prévia 3D e todas as layers (ou grupos)
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
  const [volume, setVolume] = useState<'manter' | 'caixa' | 'faces' | 'espaco' | null>(null)
  const [espaco, setEspaco] = useState<number | null>(null)
  const [lendo, setLendo] = useState<string | null>(null)
  const [usarAltura, setUsarAltura] = useState(true)
  const [destaque, setDestaque] = useState<string | null>(null)

  // No IFC, o modelo é a envoltória do ambiente escolhido, já separada pelos elementos que a delimitam.
  const doEspaco = useMemo(() => {
    const e = arquivo?.ifc?.espacos.find((x) => x.id === espaco)
    return arquivo?.ifc && e ? modeloDoEspaco(arquivo.ifc, e) : null
  }, [arquivo, espaco])
  const modelo = useMemo<Modelo | null>(() => {
    if (!arquivo) return null
    if (arquivo.formato === 'IFC') return doEspaco?.modelo ?? null
    return arquivo.formato === 'DXF' ? lerDXF(arquivo.texto) : lerOBJ(arquivo.texto, agrupar)
  }, [arquivo, agrupar, doEspaco])
  const espacos = useMemo(() => (arquivo?.ifc?.espacos ?? [])
    .map((e) => ({ id: e.id, rotulo: rotuloEspaco(e), volume: Math.abs(volumeAssinado(e.triangulos)) }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR', { numeric: true })), [arquivo])
  const un = unidade ?? (modelo ? unidadeProvavel(modelo) : 'm')
  const quadro = useMemo(() => (modelo?.faces.length ? quadroDeAreas(modelo, un, separar) : null), [modelo, un, separar])
  const chaves = useMemo(() => (quadro ? quadro.linhas.map((l) => l.chave) : []), [quadro])
  const corDe = (chave: string) => CORES_LAYER[Math.max(0, chaves.indexOf(chave)) % CORES_LAYER.length]
  const facesVisor = useMemo(() => (quadro ? quadro.faces.map((f) => ({ c: f.chave, pontos: f.pontos })) : []), [quadro])

  // Volume pelas faces só é confiável quando não passa da caixa: acima dela há superfícies internas ou o modelo está aberto.
  const facesConfiaveis = !!quadro && quadro.volumeFaces > 0.3 * quadro.volumeCaixa && quadro.volumeFaces <= quadro.volumeCaixa * 1.001
  const origemVolume = volume ?? (doEspaco ? 'espaco' : facesConfiaveis ? 'faces' : 'caixa')
  const altura = quadro ? quadro.caixa.max[2] - quadro.caixa.min[2] : 0

  async function abrir(f: File | undefined) {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (ext !== 'dxf' && ext !== 'obj' && ext !== 'ifc') { setErro('Use um arquivo .dxf, .obj ou .ifc.'); return }
    if (ext === 'ifc') { await abrirIFC(f); return }
    if (f.size > 80 * 1024 * 1024) { setErro('O arquivo passa de 80 MB. Exporte só o ambiente que será avaliado.'); return }
    const texto = await f.text()
    if (ext === 'dxf' && !/^\s*0\s*\r?\n\s*SECTION/m.test(texto)) { setErro('Este DXF parece ser binário. Exporte o DXF em formato ASCII (texto).'); return }
    setErro(null)
    setUnidade(null)
    setVolume(null)
    setAgrupar('grupo')
    setArquivo({ nome: f.name, texto, formato: ext === 'dxf' ? 'DXF' : 'OBJ' })
  }

  async function abrirIFC(f: File) {
    if (f.size > 300 * 1024 * 1024) { setErro('O arquivo passa de 300 MB. Exporte só o pavimento do ambiente avaliado.'); return }
    setErro(null)
    setLendo(f.name)
    try {
      // A leitura do IFC (web-ifc, em WebAssembly) só é baixada quando o usuário abre um IFC.
      const { lerIFC } = await import('./ifc')
      const ifc = await lerIFC(new Uint8Array(await f.arrayBuffer()), () => wasmIFC)
      if (!ifc.espacos.length) {
        setErro(`“${f.name}” não tem ambientes (IfcSpace). No Revit, marque “Exportar ambientes” (Export rooms in 3D views) na exportação IFC; no ArchiCAD, inclua as zonas.`)
        return
      }
      setUnidade(null)
      setVolume(null)
      // Começa pelo primeiro ambiente da lista, em ordem de número e nome.
      setEspaco([...ifc.espacos].sort((a, b) => rotuloEspaco(a).localeCompare(rotuloEspaco(b), 'pt-BR', { numeric: true }))[0].id)
      setArquivo({ nome: f.name, texto: '', formato: 'IFC', ifc })
    } catch (e) {
      setErro(`Não foi possível ler “${f.name}” como IFC (${e instanceof Error ? e.message : String(e)}). Exporte em IFC 2x3 ou IFC4.`)
    } finally {
      setLendo(null)
    }
  }

  async function abrirExemplo(ext: 'dxf' | 'obj' | 'ifc') {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}exemplos/sala-de-aula.${ext}`)
      if (!r.ok) throw new Error(String(r.status))
      await abrir(new File([await r.arrayBuffer()], `sala-de-aula.${ext}`))
    } catch {
      setErro('Não foi possível abrir o exemplo. Baixe o arquivo e escolha-o aqui.')
    }
  }

  function importar() {
    if (!quadro || !arquivo) return
    const escolhas = quadro.linhas.map((linha) => ({ linha, destino: sugerirDestino(linha) }))
    const r = aplicarImportacao(cenario, escolhas, { substituir, vaosRecortados: vaos || !!arquivo.ifc }, catalogo)
    if ('erro' in r) { setErro(r.erro); return }
    const v = origemVolume === 'caixa' ? quadro.volumeCaixa : origemVolume === 'faces' ? quadro.volumeFaces : origemVolume === 'espaco' ? doEspaco?.volume : undefined
    aoImportar({
      arquivo: arquivo.nome,
      superficies: r.superficies,
      grupos: r.grupos,
      // Pontos arredondados ao milímetro, para o projeto ficar leve no armazenamento.
      modelo: { arquivo: arquivo.nome, faces: quadro.faces.map((f) => ({ g: f.chave, p: f.pontos.flat().map((v) => Math.round(v * 1000) / 1000) })) },
      volume: v ? Math.round(v * 10) / 10 : undefined,
      peDireito: usarAltura && altura > 0 ? Math.round(altura * 100) / 100 : undefined,
    })
  }

  const somas = quadro ? ORIENTACOES.map((o) => quadro.linhas.reduce((a, l) => a + l.areas[o], 0)) : []
  const ignoradas = modelo ? Object.entries(modelo.ignoradas) : []
  const dim = quadro ? [0, 1, 2].map((k) => quadro.caixa.max[k] - quadro.caixa.min[k]) : []
  const nomeGrupos = separar ? 'linhas' : arquivo?.formato === 'IFC' ? 'superfícies' : arquivo?.formato === 'OBJ' ? (agrupar === 'grupo' ? 'grupos' : 'materiais') : 'layers'

  return (
    <Modal titulo="Importar modelo" aoFechar={aoFechar} largo>
      <input ref={entrada} type="file" accept=".dxf,.obj,.ifc" hidden onChange={(e) => { abrir(e.target.files?.[0]); e.target.value = '' }} />
      {lendo && <p className="importar-lendo"><Icone nome="enviar" tamanho={18} />Lendo “{lendo}”. Modelos grandes podem levar alguns segundos.</p>}
      {!arquivo && !lendo && (
        <div className="importar-inicio">
          <button type="button" className="importar-soltar" onClick={() => entrada.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); abrir(e.dataTransfer.files[0]) }}>
            <Icone nome="enviar" tamanho={26} />
            <b>Escolha ou arraste um arquivo DXF, OBJ ou IFC</b>
            <span className="suave">O sistema lê as faces do modelo, separa por layer e mostra a prévia 3D e as áreas antes de importar.</span>
          </button>
          <p className="importar-exemplo suave">Para experimentar, use a sala de aula do guia (9 × 7 × 3 m):
            <button type="button" className="btn fantasma pequeno" onClick={() => abrirExemplo('dxf')}>Abrir exemplo DXF</button>
            <button type="button" className="btn fantasma pequeno" onClick={() => abrirExemplo('obj')}>Abrir exemplo OBJ</button>
            <button type="button" className="btn fantasma pequeno" onClick={() => abrirExemplo('ifc')}>Abrir exemplo IFC</button>
            <a className="btn fantasma pequeno" href={`${import.meta.env.BASE_URL}exemplos/sala-de-aula.dxf`} download>Baixar DXF</a>
          </p>
          <ul className="importar-dicas">
            <li><b>DXF 3D:</b> faces 3D (3DFACE) e malhas (polyface mesh), como exporta o SketchUp. Blocos são lidos com a posição, a escala e a rotação. Exporte em ASCII.</li>
            <li><b>DXF 2D:</b> polilinhas fechadas viram áreas de piso. Informe as paredes depois, na etapa de superfícies.</li>
            <li><b>IFC (Revit, ArchiCAD e outros):</b> escolha um ambiente (IfcSpace). O programa usa o volume do ambiente e encontra, em cada trecho do contorno, a parede, a laje, o forro, a janela ou a porta que o delimita, com o material do elemento. Funciona com modelos de projeto, sem preparar o modelo para acústica.</li>
            <li><b>OBJ:</b> as faces ficam agrupadas pelos grupos ou pelos materiais do modelo. SketchUp, Revit, Rhino e Blender exportam OBJ.</li>
            <li>Modele só o ambiente avaliado, com cada material em uma layer (ou etiqueta) e portas e janelas em layers próprias.</li>
          </ul>
        </div>
      )}

      {arquivo && arquivo.formato !== 'IFC' && modelo && !quadro && (
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

          <Visor3D faces={facesVisor} cor={corDe} destaque={destaque} rotulo="Prévia 3D do modelo. Arraste para girar." />

          <div className="linha importar-opcoes">
            {arquivo.ifc && (
              <label className="campo">Ambiente (IfcSpace)
                <select value={espaco ?? ''} onChange={(e) => { setEspaco(Number(e.target.value)); setDestaque(null) }}>
                  {espacos.map((e) => <option key={e.id} value={e.id}>{e.rotulo} · {fmt(e.volume, 1)} m³</option>)}
                </select>
                <small className="nota">{espacos.length} {espacos.length === 1 ? 'ambiente' : 'ambientes'} no arquivo ({arquivo.ifc.schema}).</small>
              </label>
            )}
            {!arquivo.ifc && <label className="campo">Unidade do desenho
              <select value={un} onChange={(e) => setUnidade(e.target.value as Unidade)}>
                {(Object.keys(ESCALA) as Unidade[]).map((u) => <option key={u} value={u}>{NOME_UNIDADE[u]}</option>)}
              </select>
              <small className="nota">{modelo.unidade ? 'Declarada no arquivo.' : 'Estimada pelo tamanho do modelo. Confira as medidas da caixa.'}</small>
            </label>}
            {arquivo.formato === 'OBJ' && objTemMateriais(arquivo.texto) && (
              <label className="campo">Agrupar faces por
                <select value={agrupar} onChange={(e) => setAgrupar(e.target.value as 'grupo' | 'material')}>
                  <option value="grupo">Grupo ou objeto</option>
                  <option value="material">Material</option>
                </select>
              </label>
            )}
            <label className="marcar"><input type="checkbox" checked={separar} onChange={(e) => setSeparar(e.target.checked)} /> Separar cada {arquivo.ifc ? 'superfície' : 'layer'} por orientação</label>
          </div>

          <div className="tabela-rolagem">
            <table className="quadro-areas">
              <thead>
                <tr>
                  <th>{arquivo.ifc ? 'Elemento · material' : 'Layer'}</th>
                  <th className="num">Faces</th>
                  {ORIENTACOES.map((o) => <th key={o} className="num">{NOME_ORIENTACAO[o]}</th>)}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody onMouseLeave={() => setDestaque(null)}>
                {quadro.linhas.map((l) => (
                  <tr key={l.chave} className={destaque === l.chave ? 'destacada' : undefined} onMouseEnter={() => setDestaque(l.chave)}>
                    <td><i className="sw" style={{ background: corDe(l.chave) }} /><b>{l.chave}</b></td>
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
          {doEspaco && doEspaco.semElemento >= 0.1 && <p className="alerta">{fmt(doEspaco.semElemento)} m² do contorno do ambiente não encontram elemento a até 1 m: são vãos abertos para outro ambiente ou trechos em que o ambiente passa dos elementos. Eles aparecem como “Sem elemento”, e o material fica para você definir.</p>}
          <p className="nota">Áreas em m². Passe o mouse em uma {arquivo.ifc ? 'linha' : 'layer'} para destacá-la na prévia. Faces com até 20° de inclinação são horizontais: abaixo da metade da altura do modelo contam como piso, acima como forro/teto. Faces a partir de 70° são paredes; entre esses ângulos, inclinadas.</p>
          {ignoradas.length > 0 && <p className="alerta">O arquivo também tem {ignoradas.map(([t, n]) => `${n} ${t}`).join(', ')}, que não entram no quadro. Para incluí-los, exporte essas superfícies como faces 3D ou malha.</p>}

          <div className="importar-opcoes-finais">
            <label className="campo">Volume (V) do ambiente
              <select value={origemVolume} onChange={(e) => setVolume(e.target.value as 'manter' | 'caixa' | 'faces' | 'espaco')}>
                {doEspaco && <option value="espaco">Pelo ambiente do IFC: {fmt(doEspaco.volume, 1)} m³</option>}
                <option value="faces">Pelas faces do modelo: {fmt(quadro.volumeFaces, 1)} m³ (modelo fechado, sem superfícies internas)</option>
                <option value="caixa">Pela caixa envolvente: {fmt(quadro.volumeCaixa, 1)} m³</option>
                <option value="manter">Manter o informado ({fmt(cenario.volume, 1)} m³)</option>
              </select>
            </label>
            <label className="marcar"><input type="checkbox" checked={usarAltura} onChange={(e) => setUsarAltura(e.target.checked)} /> Usar a altura do modelo como pé-direito (h): {fmt(altura)} m</label>
            {!arquivo.ifc && <label className="marcar"><input type="checkbox" checked={vaos} onChange={(e) => setVaos(e.target.checked)} /> As paredes do modelo já têm os vãos de portas e janelas recortados (a área das esquadrias volta para a parede base)</label>}
            <label className="marcar"><input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} /> Substituir as superfícies atuais do cenário “{cenario.nome}”</label>
          </div>
          <p className="nota">{arquivo.ifc ? 'Cada linha vira uma superfície com o tipo do elemento e o material do IFC. Portas e janelas entram como esquadrias na parede, e a área delas volta para a parede base. Escolha o material da biblioteca de cada superfície na etapa de superfícies.' : <>Cada layer vira uma superfície com o nome da layer. O tipo inicial vem do nome e da orientação das faces, e o material é o padrão do tipo. Depois de importar, ajuste o tipo e o material de cada uma na etapa de superfícies.</>}</p>
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
