/**
 * Markdown mínimo e previsível para o corpo editorial.
 * Suporta: parágrafos, listas (- / 1.), **bold**, *itálico*, [link](url).
 * Não é um processador de texto: o Book Builder compõe, não reescreve.
 */
import type { ReactNode } from "react";

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      return (
        <a key={key} href={link[2]}>
          {link[1]}
        </a>
      );
    }
    return part;
  });
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (text) out.push(<p key={`p-${out.length}`}>{renderInline(text, `p${out.length}`)}</p>);
  };

  const flushList = () => {
    if (!list) return;
    const current = list;
    list = null;
    const items = current.items.map((item, i) => <li key={i}>{renderInline(item, `li${i}`)}</li>);
    out.push(
      current.ordered ? (
        <ol key={`l-${out.length}`}>{items}</ol>
      ) : (
        <ul key={`l-${out.length}`}>{items}</ul>
      ),
    );
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const bullet = /^[-•]\s+(.*)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      const item = (bullet ? bullet[1] : ordered![1]) ?? "";
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push(item);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();

  return <>{out}</>;
}
