"""Exporta a aba MATERIAIS da planilha de TR para src/dados/materiais.json.

Uso: python3 scripts/exportar_materiais.py caminho/PLANILHA_TR.xlsx
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

BANDAS = [125, 250, 500, 1000, 2000, 4000]


def slug(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")


def main(caminho: str) -> None:
    ws = openpyxl.load_workbook(caminho, data_only=True)["MATERIAIS"]
    materiais, ids = [], set()
    for linha in ws.iter_rows(min_row=2, values_only=True):
        nome, tipo, *alfas = linha[:8]
        if not nome or nome == 0:
            continue
        nome = " ".join(str(nome).split())
        base = slug(nome)
        id_, n = base, 2
        while id_ in ids:
            id_, n = f"{base}-{n}", n + 1
        ids.add(id_)
        materiais.append({
            "id": id_,
            "nome": nome,
            "tipo": " ".join(str(tipo).split()),
            "alfa": [float(a or 0) for a in alfas],
        })
    destino = Path(__file__).resolve().parent.parent / "src" / "dados" / "materiais.json"
    linhas = ",\n".join("  " + json.dumps(m, ensure_ascii=False) for m in materiais)
    destino.write_text("[\n" + linhas + "\n]\n", encoding="utf-8")
    print(f"{len(materiais)} materiais exportados para {destino}")


if __name__ == "__main__":
    main(sys.argv[1])
