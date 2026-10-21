// Gera os prints do guia do usuário (public/guia/*.jpg) a partir do app rodando em vite preview.
// Uso: npx vite build && npx vite preview --port 4173 & NODE_PATH=$(npm root -g) node scripts/prints-guia.cjs
const { chromium } = require('playwright')
const path = require('path')
const BASE = process.env.BASE || 'http://localhost:4173/'
const SAIDA = path.join(__dirname, '..', 'public', 'guia')

;(async () => {
  require('fs').mkdirSync(SAIDA, { recursive: true })
  const navegador = await chromium.launch()
  const p = await navegador.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 })
  await p.goto(BASE)
  await p.waitForTimeout(700)

  // Destaca elementos com contorno laranja e número, como nos passos do texto.
  async function marcar(alvos) {
    await p.evaluate((alvos) => {
      document.querySelectorAll('.guia-marca').forEach((e) => e.remove())
      alvos.forEach(([seletor, n, indice = 0], k) => {
        const el = document.querySelectorAll(seletor)[indice]
        if (!el) throw new Error('não achei ' + seletor)
        const r = el.getBoundingClientRect()
        const m = document.createElement('div')
        m.className = 'guia-marca'
        Object.assign(m.style, { position: 'absolute', left: `${r.left + scrollX - 5}px`, top: `${r.top + scrollY - 5}px`, width: `${r.width + 10}px`, height: `${r.height + 10}px`, border: '3px solid #E0523E', borderRadius: '14px', zIndex: 9999, pointerEvents: 'none', boxShadow: '0 0 0 4px rgba(224,82,62,.18)' })
        const b = document.createElement('span')
        b.textContent = n ?? String(k + 1)
        Object.assign(b.style, { position: 'absolute', left: '-14px', top: '-14px', width: '26px', height: '26px', borderRadius: '50%', background: '#E0523E', color: '#fff', font: '700 14px Onest, sans-serif', display: 'grid', placeItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.25)' })
        m.appendChild(b)
        document.body.appendChild(m)
      })
    }, alvos)
  }
  async function foto(nome, seletor, folga = 16, altura = 1300) {
    await p.waitForTimeout(250)
    const r = await p.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height } }, seletor)
    await p.screenshot({ path: path.join(SAIDA, `${nome}.jpg`), type: 'jpeg', quality: 82, fullPage: true, clip: { x: Math.max(0, r.x - folga), y: Math.max(0, r.y - folga), width: r.w + 2 * folga, height: Math.min(altura, r.h + 2 * folga) } })
    await p.evaluate(() => document.querySelectorAll('.guia-marca').forEach((e) => e.remove()))
  }
  const etapa = async (t) => { await p.locator('.etapas .pilula', { hasText: t }).click(); await p.waitForTimeout(300); await p.evaluate(() => scrollTo(0, 0)) }

  // 1. Criar projeto
  await marcar([['.cabecalho-acoes .btn.primario', '1'], ['.cartao-projeto', '2']])
  await foto('01-inicio', '.pagina', 8)
  await p.locator('.cabecalho-acoes .btn.primario').click()
  await p.waitForTimeout(300)
  await p.fill('.modal input[type=text]', 'Sala de aula · exemplo')
  await marcar([['.modal input[type=text]', '1'], ['.modal .capa-envio', '2'], ['.modal .btn.primario', '3']])
  await foto('01-novo-projeto', '.modal', 4)
  await p.keyboard.press('Escape')

  // Abre o projeto de exemplo
  await p.locator('.cartao-projeto-abrir').first().click()
  await p.waitForTimeout(400)
  await marcar([['.capa-projeto', '1'], ['.cenarios', '2'], ['.etapas', '3'], ['.editor-resultado', '4']])
  await foto('01-editor', '.pagina', 8, 1000)

  // 2. Ambiente
  await etapa('Ambiente')
  await marcar([['.uso[aria-pressed="true"]', '1'], ['.painel .linha .campo', '2', 0], ['.painel .linha .campo select', '3'], ['.criterio', '4']])
  await foto('02-ambiente', '.painel', 16, 1500)
  await p.locator('.criterios-complementares .chip', { hasText: 'B5' }).click()
  await marcar([['.criterios-complementares', '1'], ['.usos.formulas', '2']])
  await foto('02-criterios', '.ambiente-avancado', 12)
  await p.locator('.criterios-complementares .chip', { hasText: 'B5' }).click()
  await p.locator('.importar-chamada .btn').click()
  await p.locator('.btn', { hasText: 'Abrir exemplo DXF' }).click()
  await p.waitForTimeout(700)
  await marcar([['.previa-modelo', '1'], ['.tabela-rolagem', '2'], ['.importar-opcoes-finais', '3'], ['.modal .acoes .btn.primario', '4']])
  await foto('02-importar', '.modal', 4, 1600)
  await p.keyboard.press('Escape')
  await p.evaluate(() => scrollTo(0, 0))

  // 3. Superfícies
  await etapa('Superfícies')
  await marcar([['.sup:not(.filha)', '1', 0], ['.sup-l2 .seg', '2', 0], ['.sup-l3 > .campo-material', '3', 0], ['.adicionar-item', '4', 0]])
  await foto('03-superficies-base', '.sups', 12)
  await marcar([['.sup.filha .sup-l1 > select', '1', 0], ['.sup.filha .sup-l1 .em select', '2', 0], ['.livre', '3', 0], ['.sup.filha .btn.secundario.pequeno', '4', 0]])
  await foto('03-superficies-itens', '.sups', 12)

  // 4. Nuvens/Baffles: cenário com nuvens
  await p.locator('.cenarios .pilula', { hasText: 'Nuvens' }).click()
  await etapa('Nuvens')
  await marcar([['.painel .sup-l1 .seg', '1', 0], ['.painel .sup .campo-material', '2'], ['.painel .sup-l2 .em', '3'], ['.painel > .linha .btn', '4', 0]])
  await foto('04-nuvens', '.painel')

  // 5. Ocupação
  await etapa('Ocupação')
  await marcar([['.painel .chips', '1'], ['.painel .sup .em', '2'], ['.painel .sup-l3', '3']])
  await foto('05-ocupacao', '.painel')

  // 6. Resultados
  await etapa('Resultados')
  await marcar([['.painel .chips', '1'], ['.painel .seg', '2'], ['.painel svg', '3'], ['.painel table.cmp', '4']])
  await foto('06-resultados', '.painel')

  // 9. Traçado de raios e 10. Aurilização
  await etapa('Traçado')
  await p.waitForTimeout(400)
  await marcar([['.raios-controles', '1'], ['.raios-ferramentas', '2'], ['.raios-visor', '3'], ['.raios-reflectograma', '4'], ['.raios-atencao', '5']])
  await foto('09-raios', '.painel', 16, 2000)
  await marcar([['.aurilizacao select', '1'], ['.aurilizacao .seg', '2'], ['.aurilizacao .chips', '3'], ['.aurilizacao .btn.primario', '4'], ['.aurilizacao .marcar', '5']])
  await foto('10-aurilizacao', '.aurilizacao', 14)

  // 7. Painel de resultado e memorial
  await p.locator('.cenarios .pilula', { hasText: 'Forro' }).click()
  await etapa('Superfícies')
  await marcar([['.editor-resultado .status', '1'], ['.editor-resultado svg', '2'], ['.editor-resultado table', '3'], ['.editor-resultado .obs', '4'], ['.editor-resultado .cartao .btn', '5', 0]])
  await foto('07-resultado', '.editor-resultado', 12)

  // 8. Biblioteca de materiais
  await p.locator('.menu .pilula', { hasText: 'Materiais' }).click()
  await p.waitForTimeout(400)
  await marcar([['.filtros .busca', '1'], ['.filtros .seg', '2'], ['.chips.rolagem', '3'], ['.cabecalho-acoes .btn.primario', '4'], ['.acoes-cartao', '5', 0]])
  await p.setViewportSize({ width: 1360, height: 1000 })
  await foto('08-biblioteca', '.pagina', 8, 760)
  await p.locator('.cabecalho-acoes .btn.primario').click()
  await p.waitForTimeout(300)
  await p.fill('.modal input[type=text]', 'Painel ripado de madeira 20 mm')
  await marcar([['.editor-imagem .btn.secundario', '1'], ['.editor-campos .campo', '2', 0], ['.editor-campos .linha .campo', '3', 0], ['.editor-campos textarea', '4'], ['.alfas-campos', '5'], ['.campo-nrc input', '6'], ['.editor-campos .acoes .btn.primario', '7']])
  await foto('08-novo-material', '.modal', 4)

  await navegador.close()
})()
