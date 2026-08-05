#!/usr/bin/env python3
"""Linter heurístico de padrões estilísticos artificiais.

Não decide qualidade. Apenas aponta concentrações de padrões.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

PATTERNS = {
    "nao_apenas_mas": r"\bnão\s+apenas\b.{0,120}\bmas\s+(?:também\s+)?",
    "mais_do_que": r"\bmais\s+do\s+que\b",
    "em_sua_essencia": r"\bem\s+sua\s+essência\b",
    "em_ultima_analise": r"\bem\s+última\s+análise\b",
    "vale_destacar": r"\bvale\s+destacar\b",
    "importante_notar": r"\bé\s+importante\s+(?:notar|observar|destacar)\b",
    "nesse_contexto": r"\bnesse\s+contexto\b",
    "rica_tapecaria": r"\bric[ao]\s+tapeçaria\b",
    "jornada": r"\bjornada\b",
    "serve_como_lembrete": r"\bserve\s+como\s+(?:um\s+)?lembrete\b",
    "em_um_mundo_onde": r"\bem\s+um\s+mundo\s+onde\b",
    "desde_os_primordios": r"\bdesde\s+os\s+primórdios\b",
    "neste_capitulo": r"\bneste\s+capítulo\b",
}

GENERIC_WORDS = [
    "profundamente", "essencialmente", "fundamentalmente",
    "intrinsecamente", "significativamente", "dinâmico",
    "complexo", "transformador", "impactante",
]

def sentence_split(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?…])\s+", text) if s.strip()]

def paragraph_split(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]

def metrics(text: str) -> dict:
    words = re.findall(r"\b[\wÀ-ÿ'-]+\b", text)
    sentences = sentence_split(text)
    paragraphs = paragraph_split(text)

    pattern_counts = {
        name: len(re.findall(pattern, text, flags=re.I | re.S))
        for name, pattern in PATTERNS.items()
    }
    generic_counts = {
        word: len(re.findall(rf"\b{re.escape(word)}\b", text, flags=re.I))
        for word in GENERIC_WORDS
    }

    starts = Counter()
    for sentence in sentences:
        first = " ".join(sentence.lower().split()[:3])
        if first:
            starts[first] += 1

    repeated_starts = {k: v for k, v in starts.items() if v >= 3}

    sent_lengths = [len(re.findall(r"\b[\wÀ-ÿ'-]+\b", s)) for s in sentences]
    para_lengths = [len(re.findall(r"\b[\wÀ-ÿ'-]+\b", p)) for p in paragraphs]

    return {
        "characters": len(text),
        "words": len(words),
        "sentences": len(sentences),
        "paragraphs": len(paragraphs),
        "avg_sentence_words": round(sum(sent_lengths) / max(1, len(sent_lengths)), 2),
        "avg_paragraph_words": round(sum(para_lengths) / max(1, len(para_lengths)), 2),
        "short_sentences_le_5": sum(1 for n in sent_lengths if n <= 5),
        "long_sentences_ge_35": sum(1 for n in sent_lengths if n >= 35),
        "pattern_counts": pattern_counts,
        "generic_word_counts": generic_counts,
        "repeated_sentence_starts": repeated_starts,
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path)
    parser.add_argument("--json", dest="json_path", type=Path)
    args = parser.parse_args()

    if not args.file.exists():
        print(f"Arquivo não encontrado: {args.file}", file=sys.stderr)
        return 2

    text = args.file.read_text(encoding="utf-8", errors="replace")
    result = metrics(text)

    critical = []
    for name, count in result["pattern_counts"].items():
        if count >= 3:
            critical.append(f"{name}: {count}")
    for start, count in result["repeated_sentence_starts"].items():
        if count >= 4:
            critical.append(f"início repetido '{start}': {count}")

    result["alerts"] = critical
    result["status"] = "REVISAR" if critical else "SEM_ALERTAS_CRITICOS"

    print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.json_path:
        args.json_path.parent.mkdir(parents=True, exist_ok=True)
        args.json_path.write_text(
            json.dumps(result, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    return 1 if critical else 0

if __name__ == "__main__":
    raise SystemExit(main())
