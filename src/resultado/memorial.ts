import { areaEfetiva, ehBase, type Avaliacao } from '../motor/acustica'
import type { Catalogo } from '../motor/materiais'
import { CATEGORIAS, FORMAS, NOME_ESTADO, type Cenario, type Projeto } from '../motor/tipos'
import { fmt } from '../ui/formato'

/** Texto do memorial de especificação de um cenário. */
export function memorial(projeto: Projeto, c: Cenario, av: Avaliacao, cat: Catalogo): string {
  const L: string[] = []
  const r = av.resultado
  L.push(`PROJETO: ${projeto.nome}`, `CENÁRIO: ${c.nome}`, `Volume (V) = ${fmt(c.volume, 1)} m³ · UR ${c.umidade ? `${c.umidade}%` : 'desconsiderada'}`, `Critério: ${av.meta.nome}`)
  if (av.tipo === 'absorcao') L.push(`A/V mínimo = ${fmt(av.meta.avMinimo, 3)} m²/m³ (pé-direito h = ${fmt(c.peDireito, 2)} m)`)
  else L.push(`${av.meta.otimo ? 'Tempo de reverberação ótimo (Tót)' : 'Tempo de reverberação alvo (Talvo)'} = ${fmt(av.meta.t)} s · ${r.formula === 'eyring' ? 'Eyring' : 'Sabine'} (ᾱ médio ${fmt(r.alfaMedioSala)})`)
  L.push('', 'SUPERFÍCIES')
  for (const s of c.superficies) {
    const base = ehBase(s) ? '' : ` sobre ${c.superficies.find((b) => b.id === s.base)?.nome ?? '?'}`
    L.push(`- ${s.nome} (${CATEGORIAS[s.categoria].nome.toLowerCase()}${base}): ${cat.get(s.material).nome} · ${fmt(areaEfetiva(c, s))} m²`)
  }
  if (c.itens.length) {
    L.push('', 'OCUPAÇÃO E ELEMENTOS')
    for (const it of c.itens) {
      const un = it.tipo === 'suspenso' && !cat.get(it.material).unidade ? 'm²' : 'un.'
      const forma = it.forma && un === 'm²' ? ` (${it.forma.quantidade} × ${FORMAS[it.forma.tipo].nome.toLowerCase()} ${it.forma.medidas.map((m) => fmt(m)).join(' × ')} m)` : ''
      L.push(`- ${it.nome}: ${un === 'm²' ? fmt(it.quantidade) : it.quantidade} ${un}${forma} · ${cat.get(it.material).nome}${it.tipo === 'assento' && it.materialOcupado ? ` / ocupado: ${cat.get(it.materialOcupado).nome}` : ''}`)
    }
  }
  L.push('', `RESULTADO: ${av.aprovado ? 'atende' : 'não atende'}${av.tipo === 'tempo' ? ` (ocupação ${r.estados.map((e) => NOME_ESTADO[e]).join(', ')})` : ''}`)
  if (av.tipo === 'tempo') for (const e of r.estados) L.push(`T ${NOME_ESTADO[e]} (s): ${r.tempo[e].map((t) => fmt(t)).join(' | ')}`)
  else L.push(`A/V: ${av.av.map((v) => fmt(v, 3)).join(' | ')}`)
  return L.join('\n')
}
