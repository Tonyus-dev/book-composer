import type { Book } from "../../book/types";
import { folioFor } from "../../book/renderer/PageRenderer";
import {
  PREFLIGHT_RULES,
  type PreflightIssue,
  type PreflightRuleId,
  type PreflightSeverity,
} from "./types";

/** folga em px para ruído de subpixel do layout */
const EPS = 1.5;
/** área segura = margem + este recuo (igual ao overlay do editor) */
const SAFE_INSET_MM = 5;
const MIN_CONTRAST = 4.5;
const MIN_CONTRAST_LARGE = 3;
/** faces editoriais que precisam existir para o PDF sair correto */
const REQUIRED_FONTS = ["EB Garamond", "Liberation Sans"];

function parseMm(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseColor(value: string): [number, number, number, number] | null {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const parts = match[1]!
    .split(/[,/\s]+/)
    .filter(Boolean)
    .map(Number);
  const [r, g, b] = parts;
  if (r === undefined || g === undefined || b === undefined) return null;
  return [r, g, b, parts[3] ?? 1];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Fundo efetivo do texto. Retorna null quando o fundo é uma arte
 * (background-image): contraste sobre imagem não é medível aqui, e chutar
 * branco geraria falso positivo em toda página de arte.
 */
function effectiveBackground(el: Element): [number, number, number] | null {
  let node: Element | null = el;
  while (node) {
    const style = getComputedStyle(node);
    if (style.backgroundImage !== "none") return null;
    const color = parseColor(style.backgroundColor);
    if (color && color[3] > 0.5) return [color[0], color[1], color[2]];
    node = node.parentElement;
  }
  return [255, 255, 255];
}

function ownText(el: Element): string {
  let text = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? "";
  }
  return text.trim();
}

/** true quando a última linha do parágrafo tem uma única palavra */
function hasWidow(el: HTMLElement): boolean {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let lastNode: Text | null = null;
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if ((node.textContent ?? "").trim().length > 0) lastNode = node;
  }
  if (!lastNode) return false;
  const raw = lastNode.textContent ?? "";
  const words = raw.trim().split(/\s+/);
  if (words.length < 3) return false;

  const lastWord = words[words.length - 1]!;
  const prevWord = words[words.length - 2]!;
  const lastStart = raw.lastIndexOf(lastWord);
  const prevStart = raw.lastIndexOf(prevWord, lastStart - 1);
  if (lastStart < 0 || prevStart < 0) return false;

  const range = document.createRange();
  range.setStart(lastNode, lastStart);
  range.setEnd(lastNode, lastStart + lastWord.length);
  const lastRect = range.getBoundingClientRect();
  range.setStart(lastNode, prevStart);
  range.setEnd(lastNode, prevStart + prevWord.length);
  const prevRect = range.getBoundingClientRect();
  range.detach();

  if (lastRect.height === 0 || prevRect.height === 0) return false;
  return lastRect.top - prevRect.top > lastRect.height * 0.6;
}

/**
 * Regras medidas: exigem o livro renderizado em escala 1:1.
 * `root` precisa conter os elementos `.k-page[data-page-id]` do livro inteiro.
 */
export function measureIssues(root: HTMLElement, book: Book): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const folioByPageId = new Map<string, number>();
  book.pages.forEach((page, index) => folioByPageId.set(page.id, folioFor(book, index)));

  const push = (
    rule: PreflightRuleId,
    severity: PreflightSeverity,
    description: string,
    context: { pageId: string | null; blockId?: string | undefined; element: string },
  ) => {
    issues.push({
      rule,
      severity,
      pageId: context.pageId,
      folio: context.pageId ? (folioByPageId.get(context.pageId) ?? null) : null,
      blockId: context.blockId,
      element: context.element,
      description,
      inspection: PREFLIGHT_RULES[rule].inspection,
      source: "measured",
    });
  };

  /* fontes: fallback silencioso arruína o PDF sem gerar erro nenhum */
  if (typeof document !== "undefined" && document.fonts) {
    for (const family of REQUIRED_FONTS) {
      if (!document.fonts.check(`16px "${family}"`)) {
        push(
          "font-substitution",
          "error",
          `Face "${family}" não carregada: o texto sai em fonte de sistema.`,
          {
            pageId: null,
            element: `documento · fonte ${family}`,
          },
        );
      }
    }
  }

  const pageEls = Array.from(root.querySelectorAll<HTMLElement>(".k-page[data-page-id]"));

  for (const pageEl of pageEls) {
    const pageId = pageEl.dataset["pageId"] ?? null;
    if (!pageId) continue;
    const page = book.pages.find((candidate) => candidate.id === pageId);
    const folio = folioByPageId.get(pageId) ?? null;
    const pageRect = pageEl.getBoundingClientRect();
    if (pageRect.width < 1) continue;

    const pxPerMm = pageRect.width / (parseMm(book.tokens.pageWidth) || 210);
    const safeInset = SAFE_INSET_MM * pxPerMm;
    const bleedPx = parseMm(book.tokens.bleed) * pxPerMm;
    const pageLabel = `página ${folio ?? "?"}`;

    const blockName = (el: Element) => {
      const blockId = (el.closest("[data-block-id]") as HTMLElement | null)?.dataset["blockId"];
      if (!blockId || !page) return { blockId, label: pageLabel };
      const index = page.blocks.findIndex((block) => block.id === blockId);
      const block = page.blocks[index];
      return {
        blockId,
        label: block ? `bloco ${index + 1} · ${block.type}` : pageLabel,
      };
    };

    /*
     * 1 — overflow real da caixa de texto e de contêineres que cortam conteúdo.
     * A própria página é ignorada: a arte de sangria sempre a "transborda" por
     * projeto, e isso não é erro.
     */
    const contentBox = pageEl.querySelector<HTMLElement>(".k-page__content");
    const clippers = Array.from(pageEl.querySelectorAll<HTMLElement>("*")).filter((el) => {
      if (el === contentBox) return false;
      if (el.classList.contains("k-bleed") || el.querySelector(".k-bleed")) return false;
      if (el.closest(".k-bleed")) return false;
      const style = getComputedStyle(el);
      return style.overflow !== "visible" || style.overflowY !== "visible";
    });
    /* A caixa de texto entra sempre: overflow visível não deixa de ser excesso. */
    for (const el of [...(contentBox ? [contentBox] : []), ...clippers]) {
      const overflowY = el.scrollHeight - el.clientHeight;
      const overflowX = el.scrollWidth - el.clientWidth;
      if (overflowY <= EPS && overflowX <= EPS) continue;
      const { blockId, label } = blockName(el);
      const isContent = el.classList.contains("k-page__content");
      const axis =
        overflowY > EPS
          ? `${Math.round(overflowY / pxPerMm)}mm de altura`
          : `${Math.round(overflowX / pxPerMm)}mm de largura`;
      push(
        isContent ? "text-overflow" : "hidden-content",
        "error",
        isContent
          ? `Conteúdo excede a caixa em ${axis}.`
          : `Contêiner corta conteúdo (${axis} além do limite).`,
        { pageId, blockId, element: isContent ? `${pageLabel} · caixa de texto` : label },
      );
    }

    /* 2 — geometria dos blocos: trim e área segura */
    const contentEl = pageEl.querySelector<HTMLElement>(".k-page__content");
    const contentRect = contentEl?.getBoundingClientRect();
    for (const el of Array.from(pageEl.querySelectorAll<HTMLElement>("[data-block-id]"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 && rect.height < 1) continue;
      const { blockId, label } = blockName(el);
      const bleeding = Boolean(el.closest(".k-bleed")) || el.querySelector(".k-bleed") !== null;

      if (!bleeding) {
        const outside =
          rect.left < pageRect.left - EPS ||
          rect.right > pageRect.right + EPS ||
          rect.top < pageRect.top - EPS ||
          rect.bottom > pageRect.bottom + EPS;
        if (outside) {
          push("element-outside-trim", "error", "Elemento atravessa a linha de corte (trim).", {
            pageId,
            blockId,
            element: label,
          });
          continue;
        }
        if (contentRect) {
          const unsafe =
            rect.left < contentRect.left - safeInset - EPS ||
            rect.right > contentRect.right + safeInset + EPS ||
            rect.top < contentRect.top - safeInset - EPS ||
            rect.bottom > contentRect.bottom + safeInset + EPS;
          if (unsafe) {
            push(
              "content-outside-safe-area",
              "warning",
              "Elemento invade a área segura de margem.",
              { pageId, blockId, element: label },
            );
          }
        }
      }
    }

    /* 3 — full bleed que não cobre a sangria */
    if (bleedPx > 0.5) {
      for (const el of Array.from(pageEl.querySelectorAll<HTMLElement>(".k-bleed"))) {
        const rect = el.getBoundingClientRect();
        const covered =
          pageRect.left - rect.left >= bleedPx * 0.9 &&
          rect.right - pageRect.right >= bleedPx * 0.9 &&
          pageRect.top - rect.top >= bleedPx * 0.9 &&
          rect.bottom - pageRect.bottom >= bleedPx * 0.9;
        if (!covered) {
          const { blockId, label } = blockName(el);
          push(
            "full-bleed-insufficient-bleed",
            "error",
            "Arte full bleed não cobre a sangria em todos os lados.",
            { pageId, blockId, element: label },
          );
        }
      }
    }

    /* 4 — tabelas mais largas que a medida */
    for (const table of Array.from(pageEl.querySelectorAll<HTMLTableElement>("table"))) {
      const holder = table.parentElement;
      if (!holder) continue;
      if (table.scrollWidth - holder.clientWidth > EPS) {
        const { blockId, label } = blockName(table);
        push(
          "table-overflow",
          "error",
          `Tabela ultrapassa a medida em ${Math.round((table.scrollWidth - holder.clientWidth) / pxPerMm)}mm.`,
          { pageId, blockId, element: label },
        );
      }
      for (const cell of Array.from(table.querySelectorAll<HTMLElement>("td, th"))) {
        if (cell.scrollHeight - cell.clientHeight <= EPS) continue;
        const { blockId, label } = blockName(cell);
        push(
          "table-cell-overflow",
          "error",
          "Célula de tabela excede a altura disponível e pode cortar texto.",
          { pageId, blockId, element: `${label} · célula` },
        );
      }
    }

    /* 5 — viúvas tipográficas */
    for (const p of Array.from(pageEl.querySelectorAll<HTMLElement>("p"))) {
      if (ownText(p).length < 80) continue;
      if (hasWidow(p)) {
        const { blockId, label } = blockName(p);
        push("widow-orphan", "warning", "Parágrafo termina com palavra isolada na última linha.", {
          pageId,
          blockId,
          element: label,
        });
      }
    }

    /* 6 — contraste de texto */
    const textEls = Array.from(
      pageEl.querySelectorAll<HTMLElement>(
        "p, li, td, th, h1, h2, h3, h4, figcaption, blockquote, span",
      ),
    );
    const reported = new Set<string>();
    for (const el of textEls) {
      if (ownText(el).length < 4) continue;
      const style = getComputedStyle(el);
      const fg = parseColor(style.color);
      if (!fg || fg[3] < 0.1) continue;
      const bg = effectiveBackground(el);
      /* texto sobre arte: contraste não é detectável — não inventamos ocorrência */
      if (!bg) continue;
      const ratio = contrastRatio([fg[0], fg[1], fg[2]], bg);
      const size = Number.parseFloat(style.fontSize);
      const bold = Number.parseInt(style.fontWeight, 10) >= 600;
      const large = size >= 24 || (size >= 18.66 && bold);
      const threshold = large ? MIN_CONTRAST_LARGE : MIN_CONTRAST;
      if (ratio >= threshold) continue;
      const { blockId, label } = blockName(el);
      const key = `${blockId ?? label}:${ratio.toFixed(1)}`;
      if (reported.has(key)) continue;
      reported.add(key);
      /* Heurística: fundo pintado nem sempre é o fundo computado. Nunca é ERROR. */
      push(
        "low-contrast",
        "warning",
        `Contraste ${ratio.toFixed(2)}:1 abaixo do mínimo ${threshold}:1.`,
        {
          pageId,
          blockId,
          element: label,
        },
      );
    }
  }

  return issues;
}

/** Espera fontes e imagens antes de medir — medir cedo gera falso positivo. */
export async function waitForLayout(root: HTMLElement, timeoutMs = 6000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  if (typeof document !== "undefined" && document.fonts) {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, timeoutMs))]);
  }
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          const remaining = Math.max(0, deadline - Date.now());
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, remaining);
        }),
    ),
  );
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
