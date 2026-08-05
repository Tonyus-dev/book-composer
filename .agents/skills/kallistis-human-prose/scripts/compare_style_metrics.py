#!/usr/bin/env python3
"""Compara métricas estilísticas entre fonte e revisão."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?…])\s+", text) if s.strip()]

def calc(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    words = re.findall(r"\b[\wÀ-ÿ'-]+\b", text)
    sentences = split_sentences(text)
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]
    sentence_lengths = [len(re.findall(r"\b[\wÀ-ÿ'-]+\b", s)) for s in sentences]
    paragraph_lengths = [len(re.findall(r"\b[\wÀ-ÿ'-]+\b", p)) for p in paragraphs]
    return {
        "words": len(words),
        "sentences": len(sentences),
        "paragraphs": len(paragraphs),
        "avg_sentence_words": round(sum(sentence_lengths)/max(1,len(sentence_lengths)),2),
        "avg_paragraph_words": round(sum(paragraph_lengths)/max(1,len(paragraph_lengths)),2),
        "short_sentences_le_5": sum(n <= 5 for n in sentence_lengths),
        "long_sentences_ge_35": sum(n >= 35 for n in sentence_lengths),
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("edited", type=Path)
    parser.add_argument("--json", dest="json_path", type=Path)
    args = parser.parse_args()

    for path in (args.source, args.edited):
        if not path.exists():
            print(f"Arquivo não encontrado: {path}", file=sys.stderr)
            return 2

    source = calc(args.source)
    edited = calc(args.edited)
    delta = {}
    for key in source:
        if isinstance(source[key], (int, float)):
            delta[key] = round(edited[key] - source[key], 2)

    result = {"source": source, "edited": edited, "delta": delta}
    print(json.dumps(result, ensure_ascii=False, indent=2))

    if args.json_path:
        args.json_path.parent.mkdir(parents=True, exist_ok=True)
        args.json_path.write_text(
            json.dumps(result, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
