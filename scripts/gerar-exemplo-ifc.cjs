// Gera public/exemplos/sala-de-aula.ifc: a mesma sala de aula do guia (9 × 7 × 3 m) em IFC4, como
// sairia de um programa de projeto: paredes, laje e forros com espessura e materiais, janela e porta
// em aberturas recortadas nas paredes e o espaço (IfcSpace) com o volume interno.
// Uso: node scripts/gerar-exemplo-ifc.cjs
const fs = require('fs')
const path = require('path')

const linhas = []
let n = 0
const add = (txt) => { linhas.push(`#${++n}=${txt};`); return `#${n}` }
let guid = 0
const novoGuid = () => `'3Sala${String(++guid).padStart(17, '0')}'`
const r = (v) => (Number.isInteger(v) ? `${v}.` : String(v))
const pt3 = (x, y, z) => add(`IFCCARTESIANPOINT((${r(x)},${r(y)},${r(z)}))`)
const pt2 = (x, y) => add(`IFCCARTESIANPOINT((${r(x)},${r(y)}))`)
const dirZ = add('IFCDIRECTION((0.,0.,1.))')
const dirX = add('IFCDIRECTION((1.,0.,0.))')
const origem = add(`IFCAXIS2PLACEMENT3D(${pt3(0, 0, 0)},${dirZ},${dirX})`)

const pessoa = add("IFCPERSON($,'Viço Acústica',$,$,$,$,$,$)")
const org = add("IFCORGANIZATION($,'Viço Acústica',$,$,$)")
const po = add(`IFCPERSONANDORGANIZATION(${pessoa},${org},$)`)
const app = add(`IFCAPPLICATION(${org},'1.0','Especificador Viço Acústica','especificador')`)
const dono = add(`IFCOWNERHISTORY(${po},${app},$,.ADDED.,$,$,$,1700000000)`)
const ctx = add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${origem},$)`)
const unidades = add(`IFCUNITASSIGNMENT((${add('IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)')},${add('IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)')},${add('IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)')}))`)
const projeto = add(`IFCPROJECT(${novoGuid()},${dono},'Sala de aula · exemplo',$,$,$,$,(${ctx}),${unidades})`)

const lugar = (x, y, z) => add(`IFCLOCALPLACEMENT($,${add(`IFCAXIS2PLACEMENT3D(${pt3(x, y, z)},${dirZ},${dirX})`)})`)
const terreno = add(`IFCSITE(${novoGuid()},${dono},'Terreno',$,$,${lugar(0, 0, 0)},$,$,.ELEMENT.,$,$,$,$,$)`)
const edificio = add(`IFCBUILDING(${novoGuid()},${dono},'Escola',$,$,${lugar(0, 0, 0)},$,$,.ELEMENT.,$,$,$)`)
const pavimento = add(`IFCBUILDINGSTOREY(${novoGuid()},${dono},'Térreo',$,$,${lugar(0, 0, 0)},$,$,.ELEMENT.,0.)`)
add(`IFCRELAGGREGATES(${novoGuid()},${dono},$,$,${projeto},(${terreno}))`)
add(`IFCRELAGGREGATES(${novoGuid()},${dono},$,$,${terreno},(${edificio}))`)
add(`IFCRELAGGREGATES(${novoGuid()},${dono},$,$,${edificio},(${pavimento}))`)

/** Caixa de (x0, y0, z0) com dimensões dx × dy × dz, em mm. */
function forma(dx, dy, dz) {
  const perfil = add(`IFCRECTANGLEPROFILEDEF(.AREA.,$,${add(`IFCAXIS2PLACEMENT2D(${pt2(dx / 2, dy / 2)},$)`)},${r(dx)},${r(dy)})`)
  const solido = add(`IFCEXTRUDEDAREASOLID(${perfil},${origem},${dirZ},${r(dz)})`)
  return add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${add(`IFCSHAPEREPRESENTATION(${ctx},'Body','SweptSolid',(${solido}))`)}))`)
}
const elementos = []
const materiais = {}
function elemento(tipo, nome, [x0, y0, z0, dx, dy, dz], material, extra = '$') {
  const id = add(`${tipo}(${novoGuid()},${dono},'${nome}',$,$,${lugar(x0, y0, z0)},${forma(dx, dy, dz)},$,${extra})`)
  elementos.push(id)
  ;(materiais[material] ??= []).push(id)
  return id
}
function abertura(parede, caixa, preenchimento) {
  const [x0, y0, z0, dx, dy, dz] = caixa
  const ab = add(`IFCOPENINGELEMENT(${novoGuid()},${dono},'Abertura',$,$,${lugar(x0, y0, z0)},${forma(dx, dy, dz)},$,.OPENING.)`)
  add(`IFCRELVOIDSELEMENT(${novoGuid()},${dono},$,$,${parede},${ab})`)
  add(`IFCRELFILLSELEMENT(${novoGuid()},${dono},$,$,${ab},${preenchimento})`)
}

const E = 150 // espessura das paredes
// Laje de piso e laje de cobertura, por fora do ambiente.
elemento('IFCSLAB', 'Laje de piso', [-E, -E, -200, 9000 + 2 * E, 7000 + 2 * E, 200], 'Piso cerâmico', '.FLOOR.')
elemento('IFCSLAB', 'Laje de cobertura', [-E, -E, 3300, 9000 + 2 * E, 7000 + 2 * E, 150], 'Concreto armado', '.ROOF.')
// Paredes com 3,30 m até a laje; o forro fica a 3 m.
const sul = elemento('IFCWALL', 'Parede sul', [-E, -E, 0, 9000 + 2 * E, E, 3300], 'Alvenaria rebocada e pintada', '.STANDARD.')
elemento('IFCWALL', 'Parede norte', [-E, 7000, 0, 9000 + 2 * E, E, 3300], 'Alvenaria rebocada e pintada', '.STANDARD.')
elemento('IFCWALL', 'Parede leste', [9000, 0, 0, E, 7000, 3300], 'Alvenaria rebocada e pintada', '.STANDARD.')
const oeste = elemento('IFCWALL', 'Parede oeste', [-E, 0, 0, E, 7000, 3300], 'Alvenaria rebocada e pintada', '.STANDARD.')
// Forro de gesso em todo o teto e forro acústico de 8 × 6,625 m logo abaixo, no centro.
elemento('IFCCOVERING', 'Forro de gesso', [0, 0, 3000, 9000, 7000, 12.5], 'Gesso liso', '.CEILING.')
elemento('IFCCOVERING', 'Forro acústico', [500, 200, 2980, 8000, 6625, 20], 'Forro acústico mineral', '.CEILING.')
// Janela de 8 × 1,2 m com peitoril de 1 m na parede sul, e porta de 0,9 × 2,1 m na parede oeste.
const janela = elemento('IFCWINDOW', 'Janela 800x120', [500, -E / 2 - 10, 1000, 8000, 20, 1200], 'Vidro comum', '1200.,8000.,.WINDOW.,$,$')
abertura(sul, [500, -E - 10, 1000, 8000, E + 20, 1200], janela)
const porta = elemento('IFCDOOR', 'Porta 90x210', [-E / 2 - 20, 1000, 0, 40, 900, 2100], 'Madeira pintada', '2100.,900.,.DOOR.,$,$')
abertura(oeste, [-E - 10, 1000, 0, E + 20, 900, 2100], porta)

const espaco = add(`IFCSPACE(${novoGuid()},${dono},'101',$,$,${lugar(0, 0, 0)},${forma(9000, 7000, 3000)},'Sala de aula',.ELEMENT.,.SPACE.,$)`)
add(`IFCRELAGGREGATES(${novoGuid()},${dono},$,$,${pavimento},(${espaco}))`)
add(`IFCRELCONTAINEDINSPATIALSTRUCTURE(${novoGuid()},${dono},$,$,(${elementos.join(',')}),${pavimento})`)
for (const [nome, ids] of Object.entries(materiais)) {
  add(`IFCRELASSOCIATESMATERIAL(${novoGuid()},${dono},$,$,(${ids.join(',')}),${add(`IFCMATERIAL('${nome}',$,$)`)})`)
}

// STEP usa ISO 8859 com escapes \X2\ para caracteres fora do ASCII.
const step = (s) => s.replace(/[^\x20-\x7e]/g, (c) => `\\X2\\${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}\\X0\\`)
const ifc = [
  'ISO-10303-21;',
  'HEADER;',
  "FILE_DESCRIPTION(('ViewDefinition [ReferenceView]'),'2;1');",
  "FILE_NAME('sala-de-aula.ifc','2026-10-21T00:00:00',(''),(''),'','Especificador Viço Acústica','');",
  "FILE_SCHEMA(('IFC4'));",
  'ENDSEC;',
  'DATA;',
  ...linhas,
  'ENDSEC;',
  'END-ISO-10303-21;',
].map(step).join('\n') + '\n'
const saida = path.join(__dirname, '..', 'public', 'exemplos', 'sala-de-aula.ifc')
fs.writeFileSync(saida, ifc)
console.log('ok', n, 'linhas', ifc.length, 'bytes')
