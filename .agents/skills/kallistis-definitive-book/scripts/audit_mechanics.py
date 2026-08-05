#!/usr/bin/env python3
"""
audit_mechanics.py

Audita os registros mecânicos do mechanical_values.json, produzindo um
relatório por categoria com contagens, amostras e hashes verificados.

Uso:
  python audit_mechanics.py <mechanical_values_json> <output_report_json>
"""
import sys, json, pathlib, hashlib, collections


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main():
    if len(sys.argv) != 3:
        print("Uso: audit_mechanics.py <mechanical_values_json> <output_report_json>")
        sys.exit(1)

    mv_path = pathlib.Path(sys.argv[1])
    out_path = pathlib.Path(sys.argv[2])
    out_path.parent.mkdir(parents=True, exist_ok=True)

    entries = json.loads(mv_path.read_text(encoding="utf-8"))
    if not isinstance(entries, list):
        print("ERRO: mechanical_values.json deve ser uma lista.")
        sys.exit(1)

    # Verify hashes
    hash_errors = []
    for e in entries:
        expected = sha256(e.get("texto_literal", ""))
        if e.get("hash") != expected:
            hash_errors.append({
                "nome": e.get("nome", ""),
                "expected": expected,
                "found": e.get("hash", ""),
            })

    # Count by category
    by_cat = collections.Counter(e.get("categoria", "unknown") for e in entries)

    # Samples per category (first 3)
    samples = {}
    for e in entries:
        cat = e.get("categoria", "unknown")
        if cat not in samples:
            samples[cat] = []
        if len(samples[cat]) < 3:
            samples[cat].append({
                "nome": e.get("nome", "")[:60],
                "capítulo": e.get("capítulo", ""),
                "números": e.get("números_encontrados", []),
                "tabela": e.get("tabela_origem"),
            })

    report = {
        "total_entries": len(entries),
        "hash_errors": len(hash_errors),
        "hash_error_detail": hash_errors[:10],
        "counts_by_category": dict(by_cat),
        "samples_by_category": samples,
        "categories_found": sorted(by_cat.keys()),
    }

    out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[audit_mechanics] {len(entries)} entradas, {len(by_cat)} categorias, {len(hash_errors)} erros de hash → {out_path}")
    sys.exit(0 if not hash_errors else 1)


if __name__ == "__main__":
    main()
