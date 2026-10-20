import { useState, type ReactNode } from 'react'
import { Icone } from '../ui/Icone'

// Os prints ficam em public/guia e são gerados por scripts/prints-guia.cjs com o projeto de exemplo.
const print = (nome: string) => `${import.meta.env.BASE_URL}guia/${nome}.jpg`

interface Figura { imagem: string; legenda: string; marcas: ReactNode[] }
interface Passo { titulo: string; resumo: string; intro: ReactNode; figuras: Figura[]; dica?: ReactNode }

const PASSOS: Passo[] = [
  {
    titulo: 'Crie o projeto',
    resumo: 'Nome, imagem e cenários',
    intro: <>Vamos acompanhar uma <b>sala de aula de 9 × 7 m com pé-direito de 3 m</b>: piso cerâmico, laje de gesso, paredes de alvenaria, oito metros de janela, uma porta e 40 carteiras. O objetivo é especificar o tratamento acústico para que a sala atenda à DIN 18041:2016. Um projeto representa uma sala; dentro dele, cada <b>cenário</b> é uma alternativa de tratamento para a mesma sala.</>,
    figuras: [
      {
        imagem: '01-inicio', legenda: 'Tela inicial',
        marcas: [<>Clique em <b>Novo projeto</b>.</>, <>Os projetos recentes aparecem em cartões. Clique no cartão para abrir. O selo mostra quantos cenários atendem à norma.</>],
      },
      {
        imagem: '01-novo-projeto', legenda: 'Janela de novo projeto',
        marcas: [<>Dê um nome ao projeto, por exemplo “Sala de aula · exemplo”.</>, <>Se quiser, envie uma foto, um render ou a planta da sala. A imagem é opcional e aparece no cartão do projeto.</>, <>Clique em <b>Criar projeto</b>.</>],
      },
      {
        imagem: '01-editor', legenda: 'Editor do projeto',
        marcas: [<>A imagem do projeto. Clique nela para trocar a imagem ou o nome.</>, <>Os cenários. No exemplo há dois: “Forro acústico” e “Nuvens no teto”. O ponto verde ou laranja indica se o cenário atende. Use <b>Duplicar cenário</b> para testar uma variação sem perder a original.</>, <>As cinco etapas do cálculo. Você pode ir e voltar entre elas a qualquer momento.</>, <>O painel de resultado, que recalcula a cada mudança.</>],
      },
    ],
  },
  {
    titulo: 'Ambiente',
    resumo: 'Classificação, volume e ar',
    intro: <>Na etapa 1 você define o critério de avaliação. A sala de aula se enquadra no <b>grupo A3 da DIN 18041:2016</b> (ensino e comunicação), e o Volume (V) é 9 × 7 × 3 = 189 m³.</>,
    figuras: [{
      imagem: '02-ambiente', legenda: 'Etapa 1 · Ambiente',
      marcas: [<>Escolha a classificação. Os grupos A e as curvas da NBR 12179:1992 definem um Tempo de reverberação alvo (T<sub>alvo</sub>); os grupos B definem uma absorção mínima por volume.</>, <>Digite o Volume (V) em m³: 189.</>, <>Escolha a Umidade relativa do ar (UR). Ela define quanto o ar absorve nas bandas agudas; no exemplo, 50%.</>, <>O quadro mostra o critério resultante: T<sub>alvo</sub> = 0,32·lg 189 − 0,17 = 0,56 s, e a faixa aceita em cada banda.</>],
    }, {
      imagem: '02-importar', legenda: 'Importar um modelo DXF ou OBJ',
      marcas: [<>A prévia 3D do modelo aberto pelo botão “Importar modelo”, no início da etapa 1, com uma cor por layer. Arraste para girar e role para aproximar.</>, <>O quadro de áreas: cada layer (ou etiqueta) com a área de piso, paredes, forro/teto e faces inclinadas. Passe o mouse em uma layer para destacá-la na prévia e confira a unidade pela caixa envolvente.</>, <>Escolha de onde vem o volume e o pé-direito, e se as paredes do modelo já têm os vãos recortados.</>, <>Importe. Cada layer vira uma superfície; ajuste o tipo e o material na etapa 2.</>],
    }],
    dica: <>No grupo B o sistema também pede o Pé-direito (h), porque o mínimo de absorção depende dele.</>,
  },
  {
    titulo: 'Superfícies',
    resumo: 'Bases, revestimentos e esquadrias',
    intro: <>Na etapa 2 você descreve tudo o que reveste a sala. Primeiro as <b>superfícies base</b> (piso, paredes e forro/teto); depois, sobre cada base, os <b>revestimentos, esquadrias e elementos</b>, que têm a área descontada da base.</>,
    figuras: [
      {
        imagem: '03-superficies-base', legenda: 'Superfícies base',
        marcas: [<>Cada base é um cartão com nome e tipo. No exemplo: Piso (9 × 7 m), Laje do teto (9 × 7 m) e Paredes (96 m², o perímetro de 32 m × 3 m).</>, <>Escolha se vai informar a área em m² ou a largura × altura.</>, <>Clique no material para abrir a biblioteca com as prévias e escolher. Ao lado aparecem os seis coeficientes de absorção sonora (α).</>, <>Use <b>Novo revestimento, esquadria ou elemento</b> para cadastrar algo sobre essa base.</>],
      },
      {
        imagem: '03-superficies-itens', legenda: 'Itens sobre as bases',
        marcas: [<>O tipo do item: revestimento (o forro acústico de 53 m²), esquadria (janelas de 8 × 1,2 m e porta de 0,9 × 2,1 m) ou elemento.</>, <>A base sobre a qual ele está. As janelas e a porta estão sobre as paredes.</>, <>A área livre da base. A laje tem 63 m², o forro ocupa 53 m² e restam 10 m² de gesso aparente. O sistema não deixa a soma passar da área da base.</>, <><b>Dimensionar área</b> mostra a faixa de área deste material que faz a sala atender, mantendo o resto do cenário.</>],
      },
    ],
  },
  {
    titulo: 'Nuvens e baffles',
    resumo: 'Elementos suspensos',
    intro: <>Na etapa 3 entram os elementos suspensos. No cenário “Nuvens no teto” o forro acústico foi retirado e no lugar entraram 18 nuvens de 1,20 × 1,20 m.</>,
    figuras: [{
      imagem: '04-nuvens', legenda: 'Etapa 3 · Nuvens e baffles',
      marcas: [<>Diga se o elemento é uma nuvem (placa horizontal) ou um baffle (placa vertical).</>, <>Escolha o modelo da nuvem ou do baffle.</>, <>Este modelo tem a Área de absorção do objeto (A<sub>obj</sub>) por peça, então basta a quantidade de peças. Com coeficiente de absorção sonora (α), as nuvens pedem a área de uma face (total, ou formato, medidas e quantidade) e os baffles pedem comprimento, largura e altura, para somar a base e as duas laterais.</>, <>Adicione outros grupos de nuvens ou de baffles.</>],
    }],
  },
  {
    titulo: 'Ocupação',
    resumo: 'Público, assentos e cenários de ocupação',
    intro: <>Na etapa 4 você cadastra quem ocupa a sala e escolhe em quais situações ela deve atender. A sala de aula tem 40 carteiras.</>,
    figuras: [{
      imagem: '05-ocupacao', legenda: 'Etapa 4 · Ocupação',
      marcas: [<>Marque os cenários de ocupação avaliados: 0%, 50% e 100%. A sala só “atende” se ficar dentro da faixa em todos os marcados.</>, <>A quantidade de assentos.</>, <>A absorção do assento vazio e do assento ocupado (carteira com aluno sentado). Com 50% de ocupação, metade das carteiras usa cada um.</>],
    }],
    dica: <>Público em pé, sem assento, entra com a fração ocupada da quantidade cadastrada.</>,
  },
  {
    titulo: 'Resultados',
    resumo: 'Comparar cenários',
    intro: <>Na etapa 5 os cenários são comparados lado a lado. No exemplo, o forro acústico atende em todas as bandas, e as 18 nuvens deixam a sala reverberante demais nos graves.</>,
    figuras: [{
      imagem: '06-resultados', legenda: 'Etapa 5 · Resultados',
      marcas: [<>Escolha os cenários que entram na comparação.</>, <>Escolha a situação de ocupação mostrada no gráfico e na tabela.</>, <>As curvas do Tempo de reverberação (T) de cada cenário. As linhas verdes tracejadas são as margens máxima e mínima do tempo ótimo.</>, <>A tabela com o T de cada banda. Valores fora da faixa ficam destacados em laranja.</>],
    }],
  },
  {
    titulo: 'Painel e memorial',
    resumo: 'Resultado ao vivo e especificação',
    intro: <>O painel à direita acompanha todas as etapas e mostra o resultado do cenário aberto, recalculado a cada mudança.</>,
    figuras: [{
      imagem: '07-resultado', legenda: 'Painel de resultado',
      marcas: [<>Se o cenário atende e qual fórmula foi usada, Sabine ou Eyring.</>, <>O Tempo de reverberação (T) por banda em cada situação de ocupação, dentro da faixa aceita.</>, <>Os valores de T comparados aos limites mínimo e máximo.</>, <>A observação sobre o Coeficiente de absorção médio (ᾱ) da sala: acima de 0,30 o cálculo passa a usar Eyring. No exemplo, ᾱ = 0,23 e vale Sabine.</>, <>O botão “Gerar memorial” cria o PDF com plantas e vistas do modelo 3D, quadro de especificações, resultados e memória de cálculo.</>],
    }],
  },
  {
    titulo: 'Biblioteca de materiais',
    resumo: 'Buscar, criar e enviar imagens',
    intro: <>Na aba Materiais ficam a base da PLANILHA_TR e os materiais que você criar. Eles valem para todos os seus projetos.</>,
    figuras: [
      {
        imagem: '08-biblioteca', legenda: 'Biblioteca de materiais',
        marcas: [<>Busque pelo nome ou pelo fabricante.</>, <>Filtre pela origem: todos, base ou meus materiais.</>, <>Filtre pela categoria do material.</>, <>Crie um material novo.</>, <>Em cada cartão: editar, copiar e excluir o material. O cartão mostra o NRC.</>],
      },
      {
        imagem: '08-novo-material', legenda: 'Criação de material',
        marcas: [<>Envie a foto do acabamento; ela aparece na escolha de materiais.</>, <>O nome do material.</>, <>A categoria, existente ou nova.</>, <>A descrição: fabricante, espessura, montagem, laudo.</>, <>Os seis coeficientes de absorção sonora (α), de 125 a 4000 Hz, do laudo do fabricante. Para nuvens e baffles vendidos por peça, marque a absorção por unidade.</>, <>O Coeficiente de redução de ruído (NRC) do laudo. Em branco, o sistema calcula o NRC pela média de α em 250, 500, 1000 e 2000 Hz.</>, <>Salve. Nos materiais da base você pode trocar a imagem ou criar uma cópia editável.</>],
      },
    ],
  },
]

const DUVIDAS: { pergunta: string; resposta: ReactNode }[] = [
  {
    pergunta: 'Qual a diferença entre os resultados para Sabine e Eyring?',
    resposta: <>As duas fórmulas estimam o Tempo de reverberação (T) a partir do Volume (V) e da absorção da sala. Sabine supõe que o som decai de forma contínua e funciona bem em salas pouco absorventes. Em salas muito absorventes cada reflexão perde muita energia, e Sabine passa a superestimar o T; Eyring considera essa perda reflexão a reflexão e dá valores menores. Por isso o sistema calcula o Coeficiente de absorção médio (ᾱ) da sala e usa Eyring quando ele passa de 0,30. Abaixo disso as duas dão resultados próximos.</>,
  },
  {
    pergunta: 'Por que alguns materiais são avaliados pelo coeficiente de absorção sonora e outros pela absorção sonora do objeto?',
    resposta: <>O Coeficiente de absorção sonora (α) diz que fração da energia uma superfície absorve por m². Serve para materiais que revestem uma área, como forros, painéis e carpetes. Objetos como cadeiras, pessoas e muitas nuvens e baffles não têm uma área de revestimento bem definida, porque o som os atinge por vários lados. Para eles o ensaio mede diretamente a Área de absorção do objeto (A<sub>obj</sub>), em m² por peça. Por isso uns pedem a área e outros a quantidade.</>,
  },
  {
    pergunta: 'O que deve ser considerado como superfície e o que deve ser considerado como ocupação e elementos?',
    resposta: <>Superfícies são tudo o que forma o envelope da sala: piso, paredes, forro ou laje, e o que está aplicado sobre eles, como revestimentos acústicos, janelas e portas. Elementos suspensos (nuvens e baffles) ficam na etapa própria porque estão soltos no volume. Ocupação é tudo o que muda com o uso: pessoas e assentos. Os assentos ficam na ocupação porque absorvem de forma diferente vazios e ocupados.</>,
  },
  {
    pergunta: 'Onde consigo informações sobre os materiais acústicos?',
    resposta: <>Nos laudos de ensaio que fabricantes e laboratórios disponibilizam, medidos em câmara reverberante pela ISO 354, com os coeficientes por banda de oitava. Também na literatura técnica, em livros de acústica arquitetônica e em artigos científicos que publicam tabelas de absorção. Prefira sempre o laudo do produto específico, com a mesma espessura e a mesma montagem (por exemplo, a distância do plenum) que você vai especificar.</>,
  },
]

export function GuiaUsuario() {
  const [atual, setAtual] = useState(0)
  const p = PASSOS[atual]
  return (
    <div className="guia">
      <nav className="guia-lista" aria-label="Passos do guia">
        {PASSOS.map((x, i) => (
          <button key={x.titulo} type="button" className="guia-item" aria-current={i === atual ? 'step' : undefined} onClick={() => setAtual(i)}>
            <span className="passo-numero">{i + 1}</span>
            <span><b>{x.titulo}</b><small>{x.resumo}</small></span>
          </button>
        ))}
      </nav>
      <div className="guia-conteudo">
        <section className="bloco">
          <span className="tag">Passo {atual + 1} de {PASSOS.length}</span>
          <h2>{p.titulo}</h2>
          <p>{p.intro}</p>
          {p.figuras.map((f) => (
            <figure key={f.imagem} className="guia-figura">
              <img src={print(f.imagem)} alt={`${f.legenda}, com os pontos explicados abaixo`} loading="lazy" />
              <figcaption>
                <b>{f.legenda}</b>
                <ol>{f.marcas.map((m, i) => <li key={i}><span className="marca-numero">{i + 1}</span><span>{m}</span></li>)}</ol>
              </figcaption>
            </figure>
          ))}
          {p.dica && <p className="obs"><b>Dica:</b> {p.dica}</p>}
          <div className="navegacao">
            {atual > 0 ? <button type="button" className="btn secundario" onClick={() => setAtual(atual - 1)}><Icone nome="voltar" />{PASSOS[atual - 1].titulo}</button> : <span />}
            {atual < PASSOS.length - 1 && <button type="button" className="btn primario" onClick={() => setAtual(atual + 1)}>Próximo: {PASSOS[atual + 1].titulo}</button>}
          </div>
        </section>
        <section className="bloco">
          <h2>Dúvidas comuns</h2>
          {DUVIDAS.map((d) => (
            <details key={d.pergunta}>
              <summary>{d.pergunta}</summary>
              <p>{d.resposta}</p>
            </details>
          ))}
        </section>
      </div>
    </div>
  )
}
