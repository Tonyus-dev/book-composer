#!/usr/bin/env python3
"""
final_preflight.py

Verifica a integridade completa do workspace antes de autorizar a revisão
literária ou antes da entrega final. Lê apenas; não edita nada.

Uso:
  python final_preflight.py <baseline_dir> <source_docx> <working_docx> <output_report>
"""
import sys, json, pathlib, hashlib, datetime


def sha256_file(path):
    h = hashlib.sha256()
    with open(str(path), "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def validate_json(path):
    try:
        data = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
        if isinstance(data, list):
            return True, len(data), None
        if isinstance(data, dict):
            return True, len(data), None
        return False, 0, "unexpected type"
    except Exception as e:
        return False, 0, str(e)


REQUIRED_MANIFESTS = [
    "document_inventory.json",
    "heading_tree.json",
    "table_manifest.json",
    "image_manifest.json",
    "mechanical_values.json",
    "source_text_hashes.json",
    "summary.json",
]


def main():
    if len(sys.argv) != 5:
        print("Uso: final_preflight.py <baseline_dir> <source_docx> <working_docx> <output_report>")
        sys.exit(1)

    baseline_dir = pathlib.Path(sys.argv[1])
    source_docx = pathlib.Path(sys.argv[2])
    working_docx = pathlib.Path(sys.argv[3])
    out = pathlib.Path(sys.argv[4])
    out.parent.mkdir(parents=True, exist_ok=True)

    checks = []
    all_passed = True

    # 1. Hash comparison
    src_hash = sha256_file(source_docx) if source_docx.is_file() else None
    work_hash = sha256_file(working_docx) if working_docx.is_file() else None
    hash_match = src_hash == work_hash and src_hash is not None
    checks.append({
        "check": "docx_hashes_identical",
        "passed": hash_match,
        "source_hash": src_hash,
        "working_hash": work_hash,
    })
    if not hash_match:
        all_passed = False

    # 2. Manifests
    for fname in REQUIRED_MANIFESTS:
        p = baseline_dir / fname
        exists = p.is_file()
        if exists:
            ok, count, err = validate_json(p)
            checks.append({
                "check": f"manifest_{fname}",
                "passed": ok and count > 0,
                "exists": True,
                "record_count": count,
                "error": err,
            })
            if not (ok and count > 0):
                all_passed = False
        else:
            checks.append({"check": f"manifest_{fname}", "passed": False, "exists": False})
            all_passed = False

    # 3. Mechanical values non-empty
    mv_path = baseline_dir / "mechanical_values.json"
    if mv_path.is_file():
        mv = json.loads(mv_path.read_text(encoding="utf-8"))
        mech_ok = isinstance(mv, list) and len(mv) > 0
        checks.append({"check": "mechanical_values_non_empty", "passed": mech_ok, "count": len(mv) if isinstance(mv, list) else 0})
        if not mech_ok:
            all_passed = False

    report = {
        "preflight_at": datetime.datetime.utcnow().isoformat() + "Z",
        "all_passed": all_passed,
        "checks": checks,
    }

    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    status = "APROVADO" if all_passed else "FALHOU"
    print(f"[final_preflight] {status} → {out}")
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
