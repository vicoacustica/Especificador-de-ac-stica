// Gera o memorial da sala de aula de exemplo com o modelo DXF importado, para conferir o PDF.
// Uso: npx vite-node scripts/memorial-exemplo.ts saida.pdf [cenário] [imagem.jpg]
import { readFileSync, writeFileSync } from 'node:fs'
import { Catalogo } from '../src/motor/materiais'
import { projetoExemplo, novoId } from '../src/dados/exemplo'
import { aplicarImportacao, sugerirDestino } from '../src/importacao/aplicar'
import { lerDXF, quadroDeAreas } from '../src/importacao/modelo'
import { gerarMemorial } from '../src/memorial/pdf'
import { especificacao } from '../src/memorial/conteudo'

const cat = new Catalogo()
const projeto = projetoExemplo()
const q = quadroDeAreas(lerDXF(readFileSync('public/exemplos/sala-de-aula.dxf', 'utf8')), 'mm')
projeto.modelo = { arquivo: 'sala-de-aula.dxf', faces: q.faces.map((f) => ({ g: f.chave, p: f.pontos.flat() })) }
for (const c of projeto.cenarios) {
  const r = aplicarImportacao(c, q.linhas.map((linha) => ({ linha, destino: sugerirDestino(linha) })), { substituir: true, vaosRecortados: true }, cat)
  if ('erro' in r) throw new Error(r.erro)
  c.superficies = r.superficies
  c.grupos = r.grupos
  const forro = c.superficies.find((s) => s.nome === 'FORRO ACUSTICO')!
  forro.material = cat.porNome('AMBI CFQ 18X18 FORRO').id
}
const c = projeto.cenarios[1]
c.superficies.find((s) => s.nome === 'PAREDES')!.material = cat.porNome('AMBI 16.1 PAREDE').id
c.itens.push({ id: novoId(), tipo: 'suspenso', nome: 'Baffles', quantidade: 6, elemento: 'baffle', material: cat.todos.find((m) => m.tipo === 'ACÚSTICO - BAFFLE' && !m.unidade)!.id, forma: { tipo: 'baffle', medidas: [1.2, 0.05, 0.3], quantidade: 6 } })
const b64 = (f: string) => readFileSync(f).toString('base64')
const cenario = projeto.cenarios[Number(process.argv[3] ?? 0)]
// Opcional: uma imagem JPEG aplicada a todos os materiais acústicos, para conferir o quadro de especificações.
const imagem = process.argv[4] ? `data:image/jpeg;base64,${b64(process.argv[4])}` : null
const imagens = imagem ? Object.fromEntries(especificacao(cenario, cat).map((e) => [e.material.id, imagem])) : {}
const doc = gerarMemorial({
  projeto, cenario, catalogo: cat,
  projetista: { nome: 'Paulo Chagas', registro: 'CAU A000000-0', empresa: 'Viço Acústica' },
  data: new Date(), imagens,
  fontes: { regular: b64('src/memorial/fontes/LiberationSans-Regular.ttf'), negrito: b64('src/memorial/fontes/LiberationSans-Bold.ttf') },
})
writeFileSync(process.argv[2] ?? 'memorial.pdf', Buffer.from(doc.output('arraybuffer')))
console.log('páginas', doc.getNumberOfPages())
