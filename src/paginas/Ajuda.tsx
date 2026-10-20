import type { ReactNode } from 'react'
import { CURVAS_NBR, GRUPOS_B, TOLERANCIA_INFERIOR, TOLERANCIA_SUPERIOR } from '../motor/criterios'
import { ABSORCAO_AR } from '../motor/materiais'
import { BANDAS } from '../motor/tipos'
import { fmt } from '../ui/formato'
import { Icone } from '../ui/Icone'

export type AbaAjuda = 'guia' | 'calculo'

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

const PASSOS: { titulo: string; texto: ReactNode }[] = [
  {
    titulo: 'Crie um projeto',
    texto: <>Um projeto representa uma sala. Dentro dele, cada <b>cenário</b> é uma alternativa de tratamento para a mesma sala, por exemplo “forro acústico” e “nuvens no teto”. Use <i>Duplicar cenário</i> para testar uma variação sem perder a original.</>,
  },
  {
    titulo: 'Ambiente',
    texto: <>Escolha o uso da sala pela classificação da norma. Os grupos A da DIN 18041 e as curvas da NBR 12179 definem um Tempo de reverberação alvo (T<sub>alvo</sub>); os grupos B definem uma Área de absorção por volume (A/V) mínima. Informe o Volume (V) em m³ e a Umidade relativa do ar (UR). O Pé-direito (h) só é pedido no grupo B.</>,
  },
  {
    titulo: 'Superfícies',
    texto: <>Cadastre primeiro as <b>superfícies base</b>: piso, paredes e forro/teto, pela área ou por largura × altura. Depois use o botão <i>Novo revestimento, esquadria ou elemento</i> logo abaixo de cada base para cadastrar o que fica sobre ela: a área deles é descontada da base, e o sistema não deixa passar da área livre. Use <i>Dimensionar área</i> para descobrir quantos m² de um revestimento fazem a sala atender.</>,
  },
  {
    titulo: 'Ocupação, nuvens e baffles',
    texto: <>Cadastre assentos, público em pé, nuvens e baffles. Nuvens e baffles com absorção por peça pedem a quantidade; os que têm coeficiente de absorção sonora (α) pedem a área total, ou o formato (quadrado, retângulo, círculo, triângulo ou trapézio), as dimensões e a quantidade de peças. Marque em quais situações de ocupação a sala deve atender: 0%, 50% e 100%. O resultado só aparece como “Atende” quando todas as situações marcadas ficam dentro da faixa. No grupo B, a verificação usa 100% de ocupação.</>,
  },
  {
    titulo: 'Resultados',
    texto: <>Selecione os cenários para ver as curvas lado a lado com as margens do tempo ótimo, e a tabela com o resultado de cada banda.</>,
  },
  {
    titulo: 'Resultado e memorial',
    texto: <>O painel à direita recalcula a cada mudança. Valores fora da faixa ficam em laranja. O memorial de especificação resume critério, superfícies, materiais e resultados, pronto para copiar.</>,
  },
  {
    titulo: 'Biblioteca de materiais',
    texto: <>Na aba Materiais você busca na base da planilha, cria materiais com os seis coeficientes do ensaio do fabricante e envia a foto de cada acabamento. Os materiais da planilha não podem ser alterados, mas você pode trocar a imagem ou criar uma cópia editável.</>,
  },
]

function Guia() {
  return (
    <>
      <ol className="passos">
        {PASSOS.map((p, i) => (
          <li key={p.titulo} className="passo">
            <span className="passo-numero">{i + 1}</span>
            <div><h2>{p.titulo}</h2><p>{p.texto}</p></div>
          </li>
        ))}
      </ol>
      <section className="bloco">
        <h2>Dúvidas comuns</h2>
        <details>
          <summary>Por que o cenário não atende se o valor a 500 Hz está bom?</summary>
          <p>A norma avalia cada banda de oitava de 125 a 4000 Hz. Materiais porosos finos absorvem bem os agudos e pouco os graves, então a sala pode ficar seca nos agudos e reverberante nos graves. A tabela de bandas mostra em laranja onde está o problema.</p>
        </details>
        <details>
          <summary>Por que o resultado mudou de Sabine para Eyring?</summary>
          <p>Quando o Coeficiente de absorção médio (ᾱ) da sala passa de 0,30, a fórmula de Sabine superestima o Tempo de reverberação (T). O sistema passa a usar Eyring automaticamente e avisa no resultado.</p>
        </details>
        <details>
          <summary>Onde ficam salvos os meus projetos?</summary>
          <p>Neste navegador. Se você limpar os dados do navegador ou trocar de computador, eles não vão junto. O login da comunidade, com projetos na nuvem, entra numa próxima versão.</p>
        </details>
        <details>
          <summary>O que entra como superfície e o que entra como ocupação?</summary>
          <p>Superfícies são áreas em m² com um coeficiente de absorção sonora (α). Assentos, pessoas, nuvens e baffles ficam na etapa de ocupação, porque contam por peça ou valem em todas as situações de ocupação.</p>
        </details>
      </section>
    </>
  )
}

function Calculo() {
  return (
    <div className="calculo">
      <section className="bloco">
        <h2>Área de absorção equivalente (A)</h2>
        <p>Cada superfície contribui com a sua área multiplicada pelo coeficiente do material, e cada peça (assento, pessoa, nuvem, baffle) com a absorção por unidade do ensaio. O cálculo é feito separadamente em cada banda de oitava.</p>
        <Equacao
          formula={<>A = Σ S<sub>i</sub>·α<sub>i</sub> + Σ n<sub>j</sub>·A<sub>j</sub></>}
          legenda={[
            [<>Área de absorção equivalente (A)</>, 'm², em cada banda'],
            [<>Área da superfície (S<sub>i</sub>)</>, 'm², já descontados os revestimentos, esquadrias e elementos sobre ela'],
            [<>Coeficiente de absorção sonora (α<sub>i</sub>)</>, 'do material da superfície, de 0 a 1 na maioria dos casos'],
            [<>Quantidade de peças (n<sub>j</sub>)</>, 'assentos, pessoas, nuvens ou baffles'],
            [<>Absorção por peça (A<sub>j</sub>)</>, 'm² Sabine por unidade, do ensaio do fabricante'],
          ]}
        />
      </section>

      <section className="bloco">
        <h2>Ocupação</h2>
        <p>Com uma ocupação de x (0, 50% ou 100%), essa fração dos assentos usa a absorção do assento ocupado e o restante a do assento vazio. O público sem assento entra com x da quantidade cadastrada. Nuvens e baffles valem em todas as situações.</p>
        <Equacao
          formula={<>A<sub>assentos</sub> = n·[(1 − x)·A<sub>vazio</sub> + x·A<sub>ocupado</sub>]</>}
          legenda={[
            [<>Fração ocupada (x)</>, '0; 0,5 ou 1'],
            [<>Quantidade de assentos (n)</>, 'unidades'],
            [<>Absorção do assento vazio (A<sub>vazio</sub>) e ocupado (A<sub>ocupado</sub>)</>, 'm² Sabine por unidade'],
          ]}
        />
      </section>

      <section className="bloco">
        <h2>Fórmula de Sabine</h2>
        <p>É a fórmula usada quando a sala não é muito absorvente. O termo 4mV soma a absorção do próprio ar, que pesa nas bandas agudas e em salas grandes.</p>
        <Equacao
          formula={<>T = 0,161·V / (A + 4mV)</>}
          legenda={[
            [<>Tempo de reverberação (T)</>, 's, tempo para o som cair 60 dB depois que a fonte para'],
            [<>Volume (V)</>, 'm³'],
            [<>Área de absorção equivalente (A)</>, 'm²'],
            [<>Coeficiente de atenuação do ar (m)</>, 'm⁻¹, depende da Umidade relativa do ar (UR) e da banda'],
          ]}
        />
      </section>

      <section className="bloco">
        <h2>Coeficiente de absorção médio (ᾱ) e a regra dos 0,30</h2>
        <p>O sistema calcula o ᾱ de cada banda e tira a média das seis bandas na situação de ocupação mais absorvente que você marcou. Se essa média passa de 0,30, todos os resultados usam a fórmula de Eyring, e o painel avisa com uma observação.</p>
        <Equacao
          formula={<>ᾱ = A / S</>}
          legenda={[
            [<>Coeficiente de absorção médio (ᾱ)</>, 'adimensional, por banda'],
            [<>Área de absorção equivalente (A)</>, 'm²'],
            [<>Área total (S)</>, 'm², soma das superfícies e das quantidades de peças, como na planilha'],
          ]}
        />
      </section>

      <section className="bloco">
        <h2>Fórmula de Eyring</h2>
        <p>Sabine supõe que o som se espalha devagar e por igual. Em salas muito absorventes cada reflexão perde muita energia, e Sabine passa a superestimar o Tempo de reverberação (T). Eyring corrige isso usando o logaritmo da parte refletida, (1 − ᾱ).</p>
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
      </section>

      <section className="bloco">
        <h2>Absorção do ar</h2>
        <p>Coeficiente de atenuação do ar (m) usado em cada banda, conforme a Umidade relativa do ar (UR). Com a opção “desconsiderar”, m = 0.</p>
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
      </section>

      <section className="bloco">
        <h2>DIN 18041, grupo A: Tempo de reverberação alvo (T<sub>alvo</sub>)</h2>
        <p>Para salas em que a comunicação a distância é o objetivo, o alvo depende do uso e do volume.</p>
        <Equacao
          formula={
            <span className="lista-formulas">
              <span>A1 Música: T<sub>alvo</sub> = 0,45·lg V + 0,07</span>
              <span>A2 Fala e palestra: T<sub>alvo</sub> = 0,37·lg V − 0,14</span>
              <span>A3 Ensino e comunicação: T<sub>alvo</sub> = 0,32·lg V − 0,17</span>
              <span>A4 Ensino inclusivo: T<sub>alvo</sub> = 0,26·lg V − 0,14</span>
              <span>A5 Esporte: T<sub>alvo</sub> = 0,75·lg V − 1,00 (máximo de 2 s)</span>
            </span>
          }
          legenda={[
            [<>Tempo de reverberação alvo (T<sub>alvo</sub>)</>, 's, com a sala ocupada'],
            [<>Volume (V)</>, 'm³; lg é o logaritmo na base 10'],
          ]}
        />
        <h3>Faixa de tolerância</h3>
        <p>O Tempo de reverberação (T) de cada banda precisa ficar entre os fatores abaixo multiplicados pelo T<sub>alvo</sub>.</p>
        <div className="tbl">
          <table>
            <thead><tr><th>Fator</th>{BANDAS.map((b) => <th key={b} className="num">{b} Hz</th>)}</tr></thead>
            <tbody>
              <tr><td>Máximo</td>{TOLERANCIA_SUPERIOR.map((f, i) => <td key={i} className="num">{fmt(f)}</td>)}</tr>
              <tr><td>Mínimo</td>{TOLERANCIA_INFERIOR.map((f, i) => <td key={i} className="num">{fmt(f)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="bloco">
        <h2>DIN 18041, grupo B: Área de absorção por volume (A/V)</h2>
        <p>Para ambientes de permanência, em que o objetivo é controlar o ruído, a norma pede uma absorção mínima em relação ao volume. A verificação é feita com 100% de ocupação, nas bandas de 250 a 2000 Hz.</p>
        <Equacao
          formula={<>A/V ≥ 1 / (c + 4,69·lg h)  para h &gt; 2,5 m</>}
          legenda={[
            [<>Área de absorção equivalente (A)</>, 'm²'],
            [<>Volume (V)</>, 'm³'],
            [<>Pé-direito (h)</>, 'm'],
            [<>Constante do grupo (c)</>, Object.entries(GRUPOS_B).map(([g, d]) => `${g}: ${fmt(d.constante)}`).join('; ')],
          ]}
        />
        <p className="nota">Com pé-direito até 2,5 m, os mínimos são fixos: {Object.entries(GRUPOS_B).map(([g, d]) => `${g} ${fmt(d.minimoAte2_5m)}`).join(', ')} m²/m³.</p>
      </section>

      <section className="bloco">
        <h2>NBR 12179: Tempo de reverberação ótimo (T<sub>ót</sub>)</h2>
        <p>Para salas de performance (estúdios, rádios, cinemas, igrejas, salas de concerto), o alvo vem do ábaco da NBR 12179 a 500 Hz. O valor é aplicado a todas as bandas, com as mesmas margens da DIN 18041.</p>
        <Equacao
          formula={<>T<sub>ót</sub> = a + b·lg V + c·(lg V)²</>}
          legenda={[
            [<>Tempo de reverberação ótimo (T<sub>ót</sub>)</>, 's'],
            [<>Volume (V)</>, 'm³'],
            [<>Coeficientes da curva (a, b, c)</>, 'ajustados às curvas da Figura 1 da norma, na tabela abaixo'],
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
      </section>

      <section className="bloco">
        <h2>Dimensionar</h2>
        <p>O botão <i>Dimensionar</i> dos revestimentos e elementos mantém todo o resto do cenário e varia apenas a área do item escolhido, procurando a faixa em que todas as bandas e todas as situações de ocupação ficam dentro da tolerância. Se nenhum valor atende, o sistema diz se o material é insuficiente sozinho ou se desequilibra as bandas.</p>
      </section>
    </div>
  )
}

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
      {aba === 'guia' ? <Guia /> : <Calculo />}
    </div>
  )
}
