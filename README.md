# Especificador Viço Acústica

Sistema online para dimensionar materiais acústicos pelo tempo de reverberação, a partir da PLANILHA_TR.

- **Critérios:** DIN 18041 (grupo A: tempo alvo; grupo B: A/V mínimo pelo pé-direito) e NBR 12179 (tempo ótimo das salas de performance) com as margens por banda da DIN 18041.
- **Fluxo:** 1. Ambiente (classificação, volume, umidade do ar) · 2. Superfícies (bases e itens descontados delas, com material) · 3. Ocupação, nuvens e baffles (0%, 50% e 100%) · 4. Comparar cenários.
- **Fórmula:** automática. Se o coeficiente de absorção médio da sala (média das seis bandas, na ocupação avaliada mais absorvente) passa de 0,30, os resultados usam Eyring; senão, Sabine.
- **Materiais:** os 393 da aba MATERIAIS, com os nomes comerciais, mais os criados pelo usuário.

## Desenvolvimento

```bash
npm ci
npm run dev     # servidor local
npm test        # motor de cálculo contra a planilha recalculada no LibreOffice
npm run lint
npm run build
```

- `src/motor/`: cálculo puro em TypeScript (`acustica.ts`, `criterios.ts`, `materiais.ts`). `casos-planilha.json` vem de `scripts/gerar_casos_planilha.py`.
- `src/dados/`: armazenamento de projetos. Hoje fica no navegador (`RepositorioLocal`); o login da comunidade entra implementando `RepositorioProjetos`.
- `src/etapas/` e `src/resultado/`: interface.
- `scripts/exportar_materiais.py` regenera `src/dados/materiais.json` a partir da planilha.
