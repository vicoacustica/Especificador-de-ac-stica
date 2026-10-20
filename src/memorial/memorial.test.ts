import { describe, expect, it } from 'vitest'
import { Catalogo } from '../motor/materiais'
import { projetoExemplo } from '../dados/exemplo'
import { lerDXF, quadroDeAreas } from '../importacao/modelo'
import dxf from '../../public/exemplos/sala-de-aula.dxf?raw'
import { especificacao } from './conteudo'
import { analisarModelo, cortarFace, marcos } from './geometria'

const q = quadroDeAreas(lerDXF(dxf), 'mm')
const modelo = { arquivo: 'sala-de-aula.dxf', faces: q.faces.map((f) => ({ g: f.chave, p: f.pontos.flat() })) }

describe('memorial', () => {
  it('separa a sala de exemplo em piso, forros e quatro paredes vistas de dentro', () => {
    const a = analisarModelo(modelo)
    expect(a.pisos).toHaveLength(1)
    expect(a.tetos.map((f) => f.g).sort()).toEqual(['FORRO', 'FORRO ACUSTICO'])
    expect(a.paredes.map((w) => +w.u[1].toFixed(2)).sort()).toEqual([7, 7, 9, 9])
    expect(a.zCorte).toBeCloseTo(1.2, 9)
    // A parede da janela (y = 0) cortada a 1,20 m: 0,50 de parede, 8,00 de janela e 0,50 de parede.
    const janela = a.paredes.find((w) => w.faces.some((f) => f.g === 'JANELAS'))!
    const cortes = janela.faces.flatMap((f) => cortarFace(janela, f, a.zCorte))
    expect(marcos(cortes.flat()).map((v) => +v.toFixed(2))).toEqual([0, 0.5, 8.5, 9])
    // A porta fica na parede x = 0, de 1,00 a 1,90 m vista de dentro.
    const porta = a.paredes.find((w) => w.faces.some((f) => f.g === 'PORTAS'))!
    expect(porta.faces.filter((f) => f.g === 'PORTAS').flatMap((f) => cortarFace(porta, f, a.zCorte)).flat().map((v) => +v.toFixed(2))).toEqual([1, 1.9])
  })

  it('especifica só os materiais acústicos, com o quantitativo em m² ou em peças', () => {
    const cat = new Catalogo()
    const [forro, nuvens] = projetoExemplo().cenarios
    expect(especificacao(forro, cat).map((e) => [e.codigo, e.material.nome, e.quantidade, e.unidade])).toEqual([['M1', 'AMBI CFQ 18X18 FORRO', 53, 'm²']])
    const e = especificacao(nuvens, cat)
    expect(e.map((x) => [x.material.nome, x.quantidade, x.unidade])).toEqual([['TRISOFT NUVEM CLÁSSICA 1200X1200X50MM (POR UNIDADE)', 18, 'un.']])
  })
})
