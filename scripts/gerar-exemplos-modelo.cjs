// Gera os modelos de exemplo da importação (public/exemplos): a sala de aula do guia, 9 × 7 × 3 m.
// DXF em milímetros com faces 3D, um bloco de porta inserido com rotação e um forro acústico;
// OBJ em metros com grupos e materiais. Uso: node scripts/gerar-exemplos-modelo.cjs
const fs = require('fs')
const path = require('path')
const SAIDA = path.join(__dirname, '..', 'public', 'exemplos')
fs.mkdirSync(SAIDA, { recursive: true })

const mm = (v) => Math.round(v * 1000)
// Retângulo vertical no plano y = const (ao longo de x) ou x = const (ao longo de y).
const emX = (y, x0, x1, z0, z1) => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]
const emY = (x, y0, y1, z0, z1) => [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]]
const horiz = (z, x0, x1, y0, y1) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]

const faces = [
  ['PISO', horiz(0, 0, 9, 0, 7)],
  ['FORRO', horiz(3, 0, 9, 0, 7)],
  ['FORRO ACUSTICO', horiz(2.98, 0.5, 8.5, 0.2, 6.825)],
  // Parede da janela (y = 0) recortada em volta da janela de 8 × 1,2 m com peitoril de 1 m.
  ['PAREDES', emX(0, 0, 9, 0, 1)], ['PAREDES', emX(0, 0, 9, 2.2, 3)], ['PAREDES', emX(0, 0, 0.5, 1, 2.2)], ['PAREDES', emX(0, 8.5, 9, 1, 2.2)],
  ['JANELAS', emX(0, 0.5, 8.5, 1, 2.2)],
  ['PAREDES', emX(7, 0, 9, 0, 3)],
  ['PAREDES', emY(9, 0, 7, 0, 3)],
  // Parede da porta (x = 0) recortada em volta do vão de 0,9 × 2,1 m.
  ['PAREDES', emY(0, 0, 1, 0, 3)], ['PAREDES', emY(0, 1.9, 7, 0, 3)], ['PAREDES', emY(0, 1, 1.9, 2.1, 3)],
]

const pares = (...p) => p.map(String).join('\n')
const face3d = (layer, pts) => pares(0, '3DFACE', 8, layer, ...pts.flatMap((p, i) => [10 + i, mm(p[0]), 20 + i, mm(p[1]), 30 + i, mm(p[2])]))
const dxf = [
  pares(0, 'SECTION', 2, 'HEADER', 9, '$INSUNITS', 70, 4, 0, 'ENDSEC'),
  pares(0, 'SECTION', 2, 'BLOCKS', 0, 'BLOCK', 8, 0, 2, 'PORTA_090', 70, 0, 10, 0, 20, 0, 30, 0),
  face3d('0', emX(0, 0, 0.9, 0, 2.1)),
  pares(0, 'ENDBLK', 0, 'ENDSEC'),
  pares(0, 'SECTION', 2, 'ENTITIES'),
  ...faces.map(([l, p]) => face3d(l, p)),
  // Porta: bloco desenhado ao longo de x, inserido girado 90° na parede x = 0, a partir de y = 1 m.
  pares(0, 'INSERT', 8, 'PORTAS', 2, 'PORTA_090', 10, 0, 20, 1000, 30, 0, 50, 90),
  pares(0, 'ENDSEC', 0, 'EOF'),
].join('\n') + '\n'
fs.writeFileSync(path.join(SAIDA, 'sala-de-aula.dxf'), dxf)

const material = { PISO: 'Ceramica', FORRO: 'Gesso', 'FORRO ACUSTICO': 'Forro_acustico', PAREDES: 'Alvenaria', JANELAS: 'Vidro', PORTAS: 'Madeira' }
const todas = [...faces, ['PORTAS', emY(0, 1, 1.9, 0, 2.1)]]
let obj = '# Sala de aula 9 x 7 x 3 m (metros)\nmtllib sala-de-aula.mtl\n'
let n = 0
for (const nome of Object.keys(material)) {
  obj += `g ${nome.replace(/ /g, '_')}\nusemtl ${material[nome]}\n`
  for (const [l, pts] of todas.filter(([l]) => l === nome)) {
    obj += pts.map((p) => `v ${p.join(' ')}`).join('\n') + '\n'
    obj += `f ${pts.map((_, i) => n + i + 1).join(' ')}\n`
    n += pts.length
  }
}
fs.writeFileSync(path.join(SAIDA, 'sala-de-aula.obj'), obj)
console.log('ok', dxf.length, obj.length)
