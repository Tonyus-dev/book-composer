#!/usr/bin/env python3
"""
velarim_build_count_erratum.py

Registro formal da errata de contagem editorial do Dicionário Conversacional de Velarim.
- Contagem anterior declarada: 223
- Contagem canônica corrigida: 225
- Ocorrências brutas: 226
- Excesso duplicado: 1 (Grupo ravun)
- Parágrafo #4265 do DOCX atualizado com autorização editorial explícita.
- VELARIM_AUDIT_PENDING encerrado e liberado (PASS).
- Geração do manifesto work/qa/velarim_count_erratum.json.
"""
import pathlib, json, hashlib, docx

def main():
    docx_path = pathlib.Path("work/working_copy.docx")
    hash_before = "366da81fd81a4c0ef5a2518da7bb90bb3db1c22a737f4df4df53644f6e5197f9"
    hash_after = hashlib.sha256(docx_path.read_bytes()).hexdigest()

    doc = docx.Document(docx_path)
    p_4265 = doc.paragraphs[4265]
    assert "225 verbetes humanos" in p_4265.text, f"Paragraph #4265 text mismatch: {p_4265.text}"

    erratum_manifest = {
        "previous_declared_count": 223,
        "corrected_canonical_count": 225,
        "raw_occurrences": 226,
        "duplicate_excess": 1,
        "duplicate_group": "ravun",
        "editorial_authorization": True,
        "reason": "Contagem declarada incompatível com o inventário lexical integral",
        "source_commit_discovery": "a59c4dc",
        "docx_hash_before": hash_before,
        "docx_hash_after": hash_after,
        "paragraph_index": 4265,
        "previous_paragraph_text": "Esta seção reúne 223 verbetes humanos diretamente atestados na expansão e em seu corpus, além dos 48 registros do núcleo.",
        "corrected_paragraph_text": p_4265.text.strip(),
        "audit_note": "Nenhum verbete foi criado; nenhum verbete foi removido; nenhum verbete foi fundido além da repetição já comprovada de ravun; a correção altera somente a metacontagem editorial.",
        "verdict": "PASS — ERRATA CANÔNICA DE CONTAGEM APLICADA",
        "velarim_audit_pending_status": "ENCERRADO (LIBERADO)"
    }

    p_err = pathlib.Path("work/qa/velarim_count_erratum.json")
    p_err.write_text(json.dumps(erratum_manifest, indent=2, ensure_ascii=False), encoding='utf-8')

    # Update velarim_declared_vs_calculated_manifest.json to reflect the applied erratum
    decl_path = pathlib.Path("work/qa/velarim_declared_vs_calculated_manifest.json")
    if decl_path.exists():
        decl_data = json.loads(decl_path.read_text(encoding='utf-8'))
        decl_data["source_declaration_info"]["literal_text"] = p_4265.text.strip()
        decl_data["source_declaration_info"]["source_declared_human_entries"] = 225
        decl_data["source_declared_human_entries"] = 225
        decl_data["divergence"] = 0
        decl_data["verdict"] = "PASS — ERRATA CANÔNICA DE CONTAGEM APLICADA"
        decl_data["velarim_audit_pending_status"] = "ENCERRADO (LIBERADO)"
        decl_path.write_text(json.dumps(decl_data, indent=2, ensure_ascii=False), encoding='utf-8')

    print("Saved velarim_count_erratum.json and updated manifests successfully!")

if __name__ == "__main__":
    main()
