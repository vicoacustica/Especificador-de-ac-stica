import type { ReactNode } from 'react'
import { CURVAS_NBR, DIN, GRUPOS_A, GRUPOS_B, NBR, TOLERANCIA_INFERIOR, TOLERANCIA_SUPERIOR } from '../motor/criterios'
import { ABSORCAO_AR } from '../motor/materiais'
import { BANDAS, FORMAS } from '../motor/tipos'
import { fmt } from '../ui/formato'
import { LIMITE_EYRING, RAZAO_FITZROY } from '../motor/acustica'

/** Equação com a legenda de cada termo logo abaixo. */
function Equacao({ formula, legenda }: { formula: ReactNode; legenda: [ReactNode, string][] }) {
  return (
    <figure className="equacao">
      <div className="equacao-formula">{formula}</div>
      <figcaption>
        <dl>
          {legenda.map(([termo, texto], i) => (
            <div key={i}><dt>{termo}</dt><dd>{texto}</dd></div>
          ))}
        </dl>
      </figcaption>
    </figure>
  )
}

function Topico({ n, titulo, children }: { n: number; titulo: ReactNode; children: ReactNode }) {
  return (
    <section className="bloco topico" id={`calculo-${n}`}>
      <div className="topico-titulo"><span className="passo-numero">{n}</span><h2>{titulo}</h2></div>
      {children}
    </section>
  )
}

const TITULOS = [
  'Coeficiente de absorção sonora (α)',
  'Absorção sonora do ar',
  'Área de absorção sonora equivalente (A)',
  'Área de absorção de um objeto (Aobj)',
  'Cenários de ocupação',
  'Tempo de reverberação (T)',
  'Fórmula de Sabine',
  'Coeficiente de absorção médio (ᾱ) e a regra para Eyring',
  'Fórmula de Eyring',
  'Fórmula de Fitzroy e a escolha da fórmula',
  'Tempo ótimo de reverberação ou tempo alvo (Talvo)',
  `Avaliação pela ${NBR}`,
  `Avaliação pela ${DIN}`,
  'Traçado de raios e tempo de atraso das reflexões',
  'Critérios complementares',
  'Aurilização',
]

export function ProcessosCalculo() {
  return (
    <div className="calculo-pagina">
      <nav className="indice" aria-label="Tópicos">
        {TITULOS.map((t, i) => <a key={t} href={`#calculo-${i + 1}`}><span>{i + 1}</span>{t}</a>)}
      </nav>
      <div className="calculo-lista">
        <Topico n={1} titulo="Coeficiente de absorção sonora (α)">
          <p>Quando o som atinge uma superfície, parte da energia é refletida e parte é absorvida, transformada em calor nos poros e fibras do material ou na vibração de painéis. O Coeficiente de absorção sonora (α) é a fração absorvida: 0 é uma superfície totalmente refletora e 1 absorve tudo. Ele muda com a frequência, por isso é dado em seis bandas de oitava, de 125 a 4000 Hz. Materiais porosos finos absorvem bem os agudos e pouco os graves; painéis com plenum e materiais mais espessos alcançam os graves.</p>
          <Equacao
            formula={<>α = E<sub>absorvida</sub> / E<sub>incidente</sub></>}
            legenda={[
              [<>Coeficiente de absorção sonora (α)</>, 'adimensional, por banda'],
              [<>Energia absorvida (E<sub>absorvida</sub>)</>, 'parcela que a superfície não devolve à sala'],
              [<>Energia incidente (E<sub>incidente</sub>)</>, 'energia sonora que chega à superfície'],
            ]}
          />
          <p className="nota">Os valores vêm de ensaio em câmara reverberante (ISO 354). Nesse ensaio o efeito de borda das amostras pode levar o α a passar de 1, como em vários produtos da base.</p>
        </Topico>

        <Topico n={2} titulo="Absorção sonora do ar">
          <p>O próprio ar absorve som, principalmente nas bandas agudas, e essa absorção cresce com o volume da sala. Em salas pequenas ela é desprezível; em auditórios, igrejas e salas de concerto ela reduz de forma visível o Tempo de reverberação (T) em 2000 e 4000 Hz. Ela depende da Umidade relativa do ar (UR): ar mais seco absorve mais os agudos.</p>
          <Equacao
            formula={<>A<sub>ar</sub> = 4·m·V</>}
            legenda={[
              [<>Área de absorção do ar (A<sub>ar</sub>)</>, 'm², por banda'],
              [<>Coeficiente de atenuação do ar (m)</>, 'm⁻¹, da tabela abaixo'],
              [<>Volume (V)</>, 'm³'],
            ]}
          />
          <div className="tbl">
            <table>
              <thead><tr><th>UR</th>{BANDAS.map((b) => <th key={b} className="num">{b} Hz</th>)}</tr></thead>
              <tbody>
                {([40, 50, 60] as const).map((u) => (
                  <tr key={u}><td>{u}%</td>{ABSORCAO_AR[u].map((m, i) => <td key={i} className="num">{fmt(m, 4)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nota">Valores de m da PLANILHA_TR. Com a opção “desconsiderar absorção do ar”, m = 0.</p>
        </Topico>

        <Topico n={3} titulo="Área de absorção sonora equivalente (A)">
          <p>A Área de absorção sonora equivalente (A) soma toda a absorção da sala em uma única grandeza: é a área de uma janela aberta, que absorve tudo, que teria o mesmo efeito que todas as superfícies e objetos juntos. Cada superfície contribui com sua área vezes o α do material, e cada objeto com a sua área de absorção por peça. O cálculo é feito em cada banda.</p>
          <Equacao
            formula={<>A = Σ S<sub>i</sub>·α<sub>i</sub> + Σ n<sub>j</sub>·A<sub>obj,j</sub></>}
            legenda={[
              [<>Área de absorção sonora equivalente (A)</>, 'm², por banda'],
              [<>Área da superfície (S<sub>i</sub>)</>, 'm², já descontado o que está sobre ela'],
              [<>Coeficiente de absorção sonora (α<sub>i</sub>)</>, 'do material da superfície'],
              [<>Quantidade de peças (n<sub>j</sub>)</>, 'assentos, pessoas, nuvens ou baffles'],
              [<>Área de absorção do objeto (A<sub>obj,j</sub>)</>, 'm² por peça'],
            ]}
          />
          <p className="nota">A absorção do ar (4mV) entra separada, nas fórmulas de Sabine e de Eyring.</p>
        </Topico>

        <Topico n={4} titulo={<>Área de absorção de um objeto (A<sub>obj</sub>)</>}>
          <p>Cadeiras, pessoas e muitas nuvens e baffles não têm uma área de revestimento bem definida: o som os atinge por vários lados. Por isso o ensaio mede diretamente a absorção de uma peça, em m² por unidade, e não um coeficiente. Basta multiplicar pela quantidade de peças.</p>
          <p>Quando o fabricante informa a nuvem ou o baffle pelo Coeficiente de absorção sonora (α), a absorção vem da área: o sistema calcula a área de uma face pelo formato da peça e multiplica pela quantidade.</p>
          <Equacao
            formula={<>A = n·S<sub>peça</sub>·α</>}
            legenda={[
              [<>Quantidade de peças (n)</>, 'unidades'],
              [<>Área de uma face da peça (S<sub>peça</sub>)</>, 'm², pelo formato abaixo'],
              [<>Coeficiente de absorção sonora (α)</>, 'do ensaio do fabricante'],
            ]}
          />
          <div className="tbl">
            <table>
              <thead><tr><th>Formato</th><th>Medidas</th><th>Área de uma face</th></tr></thead>
              <tbody>
                {Object.values(FORMAS).map((f) => (
                  <tr key={f.nome}><td>{f.nome}</td><td>{f.medidas.join(', ')}</td><td>{{ Quadrado: 'L²', Retângulo: 'L × C', Círculo: 'π·D² / 4', Triângulo: 'b × h / 2', Trapézio: '(B + b) × h / 2' }[f.nome]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Topico>

        <Topico n={5} titulo="Cenários de ocupação">
          <p>Pessoas absorvem muito som, então a mesma sala soa diferente vazia e cheia. O sistema avalia a sala com 0%, 50% e 100% de ocupação, conforme você marcar, e mostra o resultado de cada situação marcada ao lado das margens. Com uma fração ocupada x, essa parte dos assentos usa a absorção do assento ocupado e o restante a do assento vazio. O público sem assento entra com x da quantidade cadastrada. Superfícies, nuvens e baffles não mudam.</p>
          <Equacao
            formula={<>A<sub>assentos</sub> = n·[(1 − x)·A<sub>vazio</sub> + x·A<sub>ocupado</sub>]</>}
            legenda={[
              [<>Fração ocupada (x)</>, '0; 0,5 ou 1'],
              [<>Quantidade de assentos (n)</>, 'unidades'],
              [<>Absorção do assento vazio (A<sub>vazio</sub>)</>, 'm² por unidade'],
              [<>Absorção do assento ocupado (A<sub>ocupado</sub>)</>, 'm² por unidade, assento com a pessoa'],
            ]}
          />
        </Topico>

        <Topico n={6} titulo="Tempo de reverberação (T)">
          <p>Depois que uma fonte sonora para, o som continua na sala por um tempo, refletindo nas superfícies e perdendo energia a cada reflexão. O Tempo de reverberação (T) é o tempo, em segundos, que o nível sonoro leva para cair 60 dB depois que a fonte para. Um T longo demais embaralha as sílabas e prejudica a inteligibilidade da fala; um T curto demais deixa a sala seca e cansativa para a música. Ele depende do volume da sala e de quanta absorção há nela, e é calculado em cada banda de oitava.</p>
        </Topico>

        <Topico n={7} titulo="Fórmula de Sabine">
          <p>Wallace Sabine mostrou, por volta de 1900, que o Tempo de reverberação (T) é proporcional ao volume e inversamente proporcional à absorção. A fórmula funciona bem em salas pouco absorventes, em que o som se espalha por igual.</p>
          <Equacao
            formula={<>T = 0,161·V / (A + 4mV)</>}
            legenda={[
              [<>Tempo de reverberação (T)</>, 's'],
              [<>Volume (V)</>, 'm³'],
              [<>Área de absorção sonora equivalente (A)</>, 'm²'],
              [<>Coeficiente de atenuação do ar (m)</>, 'm⁻¹'],
            ]}
          />
          <p className="nota">0,161 é a constante para unidades métricas, ligada à velocidade do som no ar.</p>
        </Topico>

        <Topico n={8} titulo="Coeficiente de absorção médio (ᾱ) e a regra para Eyring">
          <p>O Coeficiente de absorção médio (ᾱ) é a absorção da sala dividida pela área total. Ele diz quão absorvente a sala é como um todo. O sistema calcula o ᾱ de cada banda, tira a média das seis bandas na situação de ocupação mais absorvente que você marcou e aplica a regra: <b>até 0,30 os resultados usam Sabine; acima de 0,30, Eyring</b>, a não ser que a absorção esteja concentrada em um par de superfícies (tópico 10). O painel de resultado avisa qual fórmula foi usada e por quê.</p>
          <Equacao
            formula={<>ᾱ = A / S</>}
            legenda={[
              [<>Coeficiente de absorção médio (ᾱ)</>, 'adimensional, por banda'],
              [<>Área de absorção sonora equivalente (A)</>, 'm²'],
              [<>Área total (S)</>, 'm², soma das superfícies e das quantidades de peças, como na PLANILHA_TR'],
            ]}
          />
        </Topico>

        <Topico n={9} titulo="Fórmula de Eyring">
          <p>Em salas muito absorventes cada reflexão perde uma parte grande da energia, e Sabine passa a superestimar o Tempo de reverberação (T). Eyring considera a perda reflexão a reflexão, usando o logaritmo da parte refletida, (1 − ᾱ). Com ᾱ pequeno as duas fórmulas dão quase o mesmo resultado.</p>
          <Equacao
            formula={<>T = 0,161·V / (4mV − S·ln(1 − ᾱ))</>}
            legenda={[
              [<>Tempo de reverberação (T)</>, 's'],
              [<>Volume (V)</>, 'm³'],
              [<>Área total (S)</>, 'm²'],
              [<>Coeficiente de absorção médio (ᾱ)</>, 'A/S, por banda'],
              [<>Coeficiente de atenuação do ar (m)</>, 'm⁻¹'],
            ]}
          />
        </Topico>

        <Topico n={10} titulo="Fórmula de Fitzroy e a escolha da fórmula">
          <p>Sabine e Eyring supõem que a absorção está espalhada pela sala. Em muitas salas reais ela fica concentrada: uma sala de aula com forro acústico e paredes de alvenaria pintada, por exemplo, tem quase toda a absorção no teto. O som que viaja na horizontal, entre as paredes, quase não encontra absorção e demora mais para se extinguir, e Sabine e Eyring passam a dar tempos curtos demais. Dariel Fitzroy (Journal of the Acoustical Society of America, 1959) propôs tratar separadamente os três pares de superfícies opostas e somar as contribuições de cada par, pesadas pela área.</p>
          <Equacao
            formula={<>T = Σ (S<sub>k</sub>/S) · 0,161·V / (4mV − S·ln(1 − ᾱ<sub>k</sub>)),  k = x, y, z</>}
            legenda={[
              [<>Tempo de reverberação (T)</>, 's'],
              [<>Área de cada par de superfícies opostas (S<sub>k</sub>)</>, 'm²: x são as paredes ao longo do comprimento, y as paredes ao longo da largura e z o piso e o teto'],
              [<>Coeficiente de absorção médio do par (ᾱ<sub>k</sub>)</>, 'A_k / S_k, por banda'],
              [<>Área total (S)</>, 'm²'],
              [<>Volume (V)</>, 'm³'],
              [<>Coeficiente de atenuação do ar (m)</>, 'm⁻¹'],
            ]}
          />
          <p>Com a absorção igual nos três pares, Fitzroy dá exatamente o resultado de Eyring. Quanto mais desigual a distribuição, maior a diferença, e o par menos absorvente pesa mais no resultado. Por isso a fórmula costuma superestimar um pouco o T quando um dos pares é muito refletor.</p>
          <h3>Como o programa escolhe a fórmula</h3>
          <p>Na escolha automática (etapa Ambiente), o programa calcula o ᾱ médio de cada par na ocupação mais absorvente. Se o par mais absorvente tem pelo menos {RAZAO_FITZROY} vezes o ᾱ do menos absorvente, a absorção é considerada concentrada e o resultado usa <b>Fitzroy</b>. Se não, vale a regra do tópico 8: <b>Eyring</b> com ᾱ acima de {fmt(LIMITE_EYRING)} e <b>Sabine</b> até {fmt(LIMITE_EYRING)}. O projetista também pode fixar uma das três fórmulas no cenário.</p>
          <p className="nota">Para Fitzroy, cada parede precisa do seu par na etapa Superfícies: x, y ou os dois, com a porcentagem da área em cada um (útil quando todas as paredes estão em uma só superfície). Na importação de modelos 3D o par vem da direção das faces. Ocupação, nuvens e baffles entram no par z. Sem o par de todas as paredes, o cálculo volta à regra de Sabine e Eyring.</p>
        </Topico>

        <Topico n={11} titulo={<>Tempo ótimo de reverberação ou tempo alvo (T<sub>alvo</sub>)</>}>
          <p>Não existe um Tempo de reverberação (T) bom para todas as salas. A fala pede T curto, para que as sílabas não se sobreponham; a música pede T mais longo, para dar continuidade e envolvimento; e salas maiores toleram T maior. As normas definem, para cada uso e volume, um Tempo de reverberação alvo (T<sub>alvo</sub>), também chamado de tempo ótimo, e uma faixa de tolerância em torno dele em cada banda. O projeto atende quando o T de todas as bandas fica dentro dessa faixa.</p>
        </Topico>

        <Topico n={12} titulo={`Avaliação pela ${NBR}`}>
          <p>A {NBR} (Tratamento acústico em recintos fechados) traz, na Figura 1, um ábaco com o Tempo ótimo de reverberação (T<sub>ót</sub>) a 500 Hz em função do volume, para salas de performance: igrejas, salas de concerto, estúdios, rádios, cinemas e salas de conferência. As curvas foram digitalizadas e ajustadas pela equação abaixo. O T<sub>ót</sub> é aplicado a todas as bandas, com a faixa de tolerância da {DIN}.</p>
          <Equacao
            formula={<>T<sub>ót</sub> = a + b·lg V + c·(lg V)²</>}
            legenda={[
              [<>Tempo ótimo de reverberação (T<sub>ót</sub>)</>, 's, a 500 Hz'],
              [<>Volume (V)</>, 'm³; lg é o logaritmo na base 10'],
              [<>Coeficientes da curva (a, b, c)</>, 'da tabela abaixo'],
            ]}
          />
          <div className="tbl">
            <table>
              <thead><tr><th>Curva</th><th className="num">a</th><th className="num">b</th><th className="num">c</th><th>Volume</th></tr></thead>
              <tbody>
                {Object.values(CURVAS_NBR).map((c) => (
                  <tr key={c.usos}><td>{c.usos}</td>{c.coef.map((k, i) => <td key={i} className="num">{fmt(k, 4)}</td>)}<td>{c.volumeMin} a {c.volumeMax} m³</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Topico>

        <Topico n={13} titulo={`Avaliação pela ${DIN}`}>
          <p>A {DIN} (Hörsamkeit in Räumen, ou audibilidade em salas) divide os ambientes em dois grupos. No <b>grupo A</b>, salas em que se precisa ouvir a distância, como salas de aula, auditórios e salas de música, o critério é um Tempo de reverberação alvo (T<sub>alvo</sub>) com a sala ocupada.</p>
          <Equacao
            formula={
              <span className="lista-formulas">
                {Object.entries(GRUPOS_A).map(([g, d]) => (
                  <span key={g}>{g} {d.uso}: T<sub>alvo</sub> = {{ A1: '0,45·lg V + 0,07', A2: '0,37·lg V − 0,14', A3: '0,32·lg V − 0,17', A4: '0,26·lg V − 0,14', A5: '0,75·lg V − 1,00 (máximo de 2 s)' }[g]}</span>
                ))}
              </span>
            }
            legenda={[
              [<>Tempo de reverberação alvo (T<sub>alvo</sub>)</>, 's'],
              [<>Volume (V)</>, 'm³; lg é o logaritmo na base 10'],
            ]}
          />
          <h3>Faixa de tolerância</h3>
          <p>O Tempo de reverberação (T) de cada banda deve ficar entre os fatores abaixo multiplicados pelo T<sub>alvo</sub>.</p>
          <div className="tbl">
            <table>
              <thead><tr><th>Fator</th>{BANDAS.map((b) => <th key={b} className="num">{b} Hz</th>)}</tr></thead>
              <tbody>
                <tr><td>Máximo</td>{TOLERANCIA_SUPERIOR.map((f, i) => <td key={i} className="num">{fmt(f)}</td>)}</tr>
                <tr><td>Mínimo</td>{TOLERANCIA_INFERIOR.map((f, i) => <td key={i} className="num">{fmt(f)}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <p>No <b>grupo B</b>, ambientes de permanência em que o objetivo é controlar o ruído, como circulações, escritórios e restaurantes, o critério é uma absorção mínima em relação ao volume, verificada com 100% de ocupação nas bandas de 250 a 2000 Hz.</p>
          <Equacao
            formula={<>A/V ≥ 1 / (c + 4,69·lg h)  para h &gt; 2,5 m</>}
            legenda={[
              [<>Área de absorção sonora equivalente (A)</>, 'm²'],
              [<>Volume (V)</>, 'm³'],
              [<>Pé-direito (h)</>, 'm'],
              [<>Constante do grupo (c)</>, Object.entries(GRUPOS_B).map(([g, d]) => `${g}: ${fmt(d.constante)}`).join('; ')],
            ]}
          />
          <p className="nota">Com pé-direito até 2,5 m, os mínimos são fixos: {Object.entries(GRUPOS_B).map(([g, d]) => `${g} ${fmt(d.minimoAte2_5m)}`).join(', ')} m²/m³.</p>
        </Topico>

        <Topico n={14} titulo="Traçado de raios e tempo de atraso das reflexões">
          <p>Na etapa 6 a planta baixa e o corte longitudinal viram desenhos em 2D com as superfícies cortadas pelo plano. O leque de raios parte da fonte em todas as direções; a cada superfície o raio reflete como em um espelho (ângulo de incidência igual ao de reflexão) e perde a parcela de energia absorvida, (1 − α). Isso mostra como o som se espalha pela sala.</p>
          <p>As reflexões que chegam ao receptor são calculadas pelo método das fontes-imagem: a fonte é espelhada na reta de cada superfície, e a imagem é espelhada de novo para as reflexões de 2ª e 3ª ordem. Quando o caminho da imagem até o receptor cruza as superfícies na ordem certa e sem obstáculos, a reflexão existe, e o comprimento do percurso é a distância da imagem ao receptor.</p>
          <Equacao
            formula={<>Δt = (r − r₀) / c</>}
            legenda={[
              [<>Atraso da reflexão em relação ao som direto (Δt)</>, 's (mostrado em ms)'],
              [<>Percurso da reflexão (r)</>, 'm'],
              [<>Percurso do som direto (r₀)</>, 'm'],
              [<>Velocidade do som (c)</>, '343 m/s'],
            ]}
          />
          <Equacao
            formula={<>L = 20·lg(r₀ / r) + 10·lg[Π(1 − α)]</>}
            legenda={[
              [<>Nível da reflexão em relação ao som direto (L)</>, 'dB'],
              [<>Coeficiente de absorção sonora (α)</>, 'de cada superfície em que a reflexão bate, na banda escolhida'],
            ]}
          />
          <p className="nota">As linhas de 50 ms e 80 ms do reflectograma são as referências usuais de integração do ouvido: reflexões que chegam antes de 50 ms reforçam a fala, e até 80 ms reforçam a música.</p>
          <h3>Reflexões que podem prejudicar a audição</h3>
          <p>O programa marca três situações de atenção. <b>Eco potencial (E)</b>: reflexão que chega mais de 50 ms depois do som direto com nível de até 10 dB abaixo dele (efeito de precedência, Haas, 1951; Kuttruff, Room Acoustics, 2009). <b>Eco palpitante (P)</b>: o som vai e volta entre duas superfícies paralelas e refletoras (α abaixo de 0,20), repetindo-se a cada 2d/c (Long, Architectural Acoustics, 2014). <b>Coloração (C)</b>: reflexão forte, até 6 dB abaixo do som direto, que chega em até 5 ms e altera o timbre por filtro pente (Everest e Pohlmann, Master Handbook of Acoustics, 2015).</p>
          <Equacao
            formula={<>T<sub>rep</sub> = 2·d / c</>}
            legenda={[
              [<>Período de repetição do eco palpitante (T<sub>rep</sub>)</>, 's (mostrado em ms)'],
              [<>Distância entre as superfícies paralelas (d)</>, 'm'],
              [<>Velocidade do som (c)</>, '343 m/s'],
            ]}
          />
        </Topico>
        <Topico n={15} titulo="Critérios complementares">
          <p>Alguns ambientes pedem mais de uma referência. Um restaurante, por exemplo, precisa de absorção suficiente para controlar o ruído (grupo B5 da {DIN}) e, ao mesmo tempo, de um tempo de reverberação adequado à conversa (curva de sala de conferência da {NBR}). Na etapa Ambiente o projetista escolhe um <b>critério principal</b> e marca quantos <b>critérios complementares</b> quiser.</p>
          <p>Todos usam os mesmos resultados de cálculo: muda só a referência de comparação. O critério principal é o usado no dimensionamento das áreas de material, no cartão do projeto e no início do memorial; os complementares aparecem no painel de resultado, na comparação de cenários e no memorial, logo abaixo do principal.</p>
        </Topico>

        <Topico n={16} titulo="Aurilização">
          <p>Aurilizar é tornar audível o resultado de um cálculo acústico: um som gravado sem sala (anecoico) é combinado com a resposta ao impulso do ambiente, e o resultado soa como se fosse tocado na sala, na posição de fonte e receptor escolhida.</p>
          <p>O programa monta uma resposta ao impulso simplificada em três partes: o som direto, as reflexões especulares calculadas no traçado de raios (planta e corte, até a 3ª ordem), com os atrasos e níveis de cada uma, e uma cauda reverberante, ruído filtrado em cada banda de oitava que decai 60 dB no Tempo de reverberação (T) da banda calculado no cenário. A energia da cauda em relação ao som direto segue a teoria da sala difusa.</p>
          <Equacao
            formula={<>E<sub>rev</sub> / E<sub>dir</sub> = 16·π·r² / R,   R = A / (1 − ᾱ)</>}
            legenda={[
              [<>Energia reverberante (E<sub>rev</sub>) e direta (E<sub>dir</sub>)</>, 'no receptor, por banda'],
              [<>Distância entre fonte e receptor (r)</>, 'm'],
              [<>Constante da sala (R)</>, 'm²'],
              [<>Área de absorção sonora equivalente (A)</>, 'm²'],
              [<>Coeficiente de absorção médio (ᾱ)</>, 'adimensional'],
            ]}
          />
          <p>O resultado é feito para comparar cenários entre si, ouvindo a mesma gravação: ele mostra bem a diferença de reverberação e de clareza, mas não substitui uma simulação acústica completa com difusão e reflexões em 3D. Use fones de ouvido.</p>
        </Topico>
      </div>
    </div>
  )
}
