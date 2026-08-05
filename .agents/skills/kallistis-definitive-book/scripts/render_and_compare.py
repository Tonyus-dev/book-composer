#!/usr/bin/env python3
"""
render_and_compare.py

Converte um DOCX para PDF via LibreOffice e registra metadados da renderização.
NÃO edita o livro. Apenas renderiza a cópia de trabalho para verificação estrutural.

Uso:
  python render_and_compare.py <docx_file> <output_dir>
"""
import sys, json, pathlib, subprocess, datetime, hashlib


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    if len(sys.argv) != 3:
        print("Uso: render_and_compare.py <docx_file> <output_dir>")
        sys.exit(1)

    docx_path = pathlib.Path(sys.argv[1])
    out_dir = pathlib.Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    if not docx_path.is_file():
        print(f"ERRO: {docx_path} não encontrado")
        sys.exit(1)

    print(f"[render_and_compare] Renderizando {docx_path} …")
    result = subprocess.run(
        ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", str(out_dir), str(docx_path)],
        capture_output=True, text=True, timeout=300,
    )

    pdf_candidates = list(out_dir.glob("*.pdf"))
    pdf_path = pdf_candidates[0] if pdf_candidates else None

    report = {
        "rendered_at": datetime.datetime.utcnow().isoformat() + "Z",
        "source_docx": str(docx_path),
        "source_sha256": sha256_file(docx_path),
        "returncode": result.returncode,
        "stdout": result.stdout[:500],
        "stderr": result.stderr[:500],
        "pdf_produced": str(pdf_path) if pdf_path else None,
        "pdf_sha256": sha256_file(pdf_path) if pdf_path else None,
        "pdf_size_bytes": pdf_path.stat().st_size if pdf_path else None,
    }

    report_path = out_dir / "render_report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    if result.returncode == 0 and pdf_path:
        print(f"[render_and_compare] PDF gerado: {pdf_path} ({report['pdf_size_bytes']} bytes)")
    else:
        print(f"[render_and_compare] ERRO na renderização (código {result.returncode})")
        print(result.stderr[:200])
        sys.exit(1)


if __name__ == "__main__":
    main()
