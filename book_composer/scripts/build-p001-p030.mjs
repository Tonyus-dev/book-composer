#!/usr/bin/env node
/**
 * KALLISTIS BOOK BUILDER — materializa P001–P030 a partir do handoff editorial.
 *
 * Entradas (caminhos imutáveis do handoff, não da biblioteca):
 *   - /home/tonyus-dev/Downloads/KALLISTIS_HANDOFF_EDITORIAL_P001_P030_v1.md
 *   - /home/tonyus-dev/Downloads/kallistis_pages_001_030.json
 *
 * Saída:
 *   - book_composer/projects/kallistis-livro-basico.json
 *
 * Regras duras (do prompt e do handoff):
 *   - Texto marcado como "TEXTO FINAL — NÃO REESCREVER" é byte-equivalente.
 *   - P023 permanece ART_PENDING_REVIEW — sem imagem no projeto.
 *   - P031–P280 entram como placeholders estruturais.
 *   - Spreads: 008-009, 021-022, 024-025, 026-027, 028-029.
 *   - Trim 140×210 mm, bleed 5 mm (PDF 150×220 mm).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..");
const HANDOFF_DIR = "/home/tonyus-dev/Downloads";
const HANDOFF_MD = `${HANDOFF_DIR}/KALLISTIS_HANDOFF_EDITORIAL_P001_P030_v1.md`;
const HANDOFF_JSON = `${HANDOFF_DIR}/kallistis_pages_001_030.json`;
const OUTPUT = resolve(REPO, "projects/kallistis-livro-basico.json");

const md = readFileSync(HANDOFF_MD, "utf8");
const handoff = JSON.parse(readFileSync(HANDOFF_JSON, "utf8"));

/* ---------- 1. Extrair TEXTO FINAL por página do markdown ----------------- */
function extractFrozenText(mdSource) {
  const out = {};
  const re = /### P(\d{3}) — (.+?)\n([\s\S]*?)(?=\n### P|\n## 6|$)/g;
  let m;
  while ((m = re.exec(mdSource)) !== null) {
    const num = Number.parseInt(m[1], 10);
    const body = m[3];
    const txtMatch = body.match(
      /\*\*TEXTO FINAL — NÃO REESCREVER\*\*\s*\n\n([\s\S]*?)(?:\n---|\s*$)/,
    );
    if (txtMatch) {
      out[num] = { title: m[2].trim(), body: txtMatch[1].trim(), blank: false };
    } else if (/\*Sem texto\.\*/.test(body)) {
      out[num] = { title: m[2].trim(), body: "", blank: true };
    } else {
      throw new Error(`Sem bloco TEXTO FINAL para P${num}`);
    }
  }
  return out;
}

const FROZEN_ARR = extractFrozenText(md);
const FROZEN = new Map(Object.entries(FROZEN_ARR).map(([k, v]) => [Number.parseInt(k, 10), v]));

/* ---------- 2. Mapa de páginas do handoff JSON --------------------------- */
const H_PAGES = new Map(handoff.pages.map((p) => [p.page, p]));

/* ---------- 3. Helpers de blocos editoriais ------------------------------ */
function blockId(pageNum, suffix) {
  return `p${String(pageNum).padStart(3, "0")}-b-${suffix}`;
}

function textBlock(pageNum, content, role = "body", extra = {}) {
  return {
    id: blockId(pageNum, "t"),
    type: "text",
    role,
    content,
    ...extra,
  };
}

function headingBlock(pageNum, level, text, eyebrow) {
  return {
    id: blockId(pageNum, `h${level}`),
    type: "heading",
    level,
    text,
    eyebrow,
  };
}

function imageBlock(pageNum, src, alt, opts = {}) {
  return {
    id: blockId(pageNum, "img"),
    type: "image",
    src,
    alt,
    position: opts.position ?? "flow",
    fit: opts.fit ?? "contain",
    fullBleed: opts.fullBleed ?? false,
    width: opts.width,
    height: opts.height,
    objectX: opts.objectX,
    objectY: opts.objectY,
    caption: opts.caption,
  };
}

function dividerBlock(pageNum, ornament = false) {
  return { id: blockId(pageNum, "div"), type: "divider", ornament };
}

/* ---------- 4. Compor P001–P030 a partir do handoff ---------------------- */
function pageFor(num) {
  const h = H_PAGES.get(num);
  if (!h) throw new Error(`Página P${num} ausente do handoff JSON`);
  const f = FROZEN.get(num);
  if (!f) throw new Error(`Texto congelado P${num} ausente do markdown`);

  /* Spreads (008-009, 021-022, 024-025, 026-027, 028-029) marcam o asset horizontal. */
  const SPREAD_ASSETS = {
    8: "/assets/handoff/approved/p008_009_luz_escuridao_sombra_pb.png",
    9: "/assets/handoff/approved/p008_009_luz_escuridao_sombra_pb.png",
    21: "/assets/handoff/approved/p021_022_kethrell_faccao_cientifica_pb.jpg",
    22: "/assets/handoff/approved/p021_022_kethrell_faccao_cientifica_pb.jpg",
    24: "/assets/handoff/approved/p024_025_outros_lightbringers_pb.jpg",
    25: "/assets/handoff/approved/p024_025_outros_lightbringers_pb.jpg",
    26: "/assets/handoff/approved/p026_027_daeren_thavin_isenna_pb.jpg",
    27: "/assets/handoff/approved/p026_027_daeren_thavin_isenna_pb.jpg",
    28: "/assets/handoff/approved/p028_029_thaeraen_tempo_escolha_pb.jpeg",
    29: "/assets/handoff/approved/p028_029_thaeraen_tempo_escolha_pb.jpeg",
  };

  /* Páginas individuais com arte vertical */
  const HERO_ASSETS = {
    4: "/assets/handoff/approved/p004_velha_e_fresta_pb.png",
    5: "/assets/handoff/approved/p005_cristal_partido_pb.png",
    6: "/assets/handoff/approved/p006_manesh_pb.png",
    7: "/assets/handoff/approved/p007_thuvel_pb.png",
    10: "/assets/handoff/approved/p010_cristal_uno_pb.png",
    11: "/assets/handoff/approved/p011_mirveth_manesh_pb.png",
    12: "/assets/handoff/approved/p012_mirveth_thuvel_pb.png",
    13: "/assets/handoff/approved/p013_pedralma_monolito_pb.png",
    14: "/assets/handoff/approved/p014_pedralma_escalas_pb.png",
    17: "/assets/handoff/approved/p017_dois_mundos_fratura_pb.png",
    19: "/assets/handoff/approved/p019_silmain_pb.png",
    20: "/assets/handoff/approved/p020_primeiras_frestas_pb.jpg",
  };

  const blocks = [];
  const settings = {
    header: false,
    footer: false,
    pageNumber: false,
    columns: 1,
    background: "paper",
    fullBleed: false,
  };

  /* P001 — ABERTURA (sem arte, sem folio, frase de respiração) */
  if (num === 1) {
    settings.pageNumber = false;
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "narrative",
      title: f.title,
      eyebrow: "ABERTURA",
      part: "Front Matter",
      settings,
      blocks: [
        headingBlock(num, 2, "ABERTURA"),
        textBlock(num, f.body, "body", { align: "center", width: "78mm" }),
      ],
    };
  }

  /* P002 — FICHA TÉCNICA (sem arte, baixo-densidade, sem header) */
  if (num === 2) {
    settings.footer = true;
    settings.pageNumber = true;
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "front_matter",
      title: f.title,
      part: "Front Matter",
      settings,
      blocks: [textBlock(num, f.body, "credits", { align: "start" })],
    };
  }

  /* P003 — SUMÁRIO (sem arte, sumário real com leaders) */
  if (num === 3) {
    settings.pageNumber = true;
    /* O sumário editorial usa dot leaders tipográficos — entries com page numeric. */
    const tocEntries = f.body
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((line) => {
        const match = line.match(/^(.+?)\s+\.+\s+(\d+|—)$/);
        if (!match) return null;
        const label = match[1].trim();
        const pageStr = match[2].trim();
        const level = label.startsWith("PARTE")
          ? "part"
          : label.startsWith("APÊNDICES") || label.startsWith("APÊNDICE")
            ? "appendix"
            : "chapter";
        return { label, page: pageStr === "—" ? 0 : Number.parseInt(pageStr, 10), level };
      })
      .filter(Boolean);
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "toc",
      title: f.title,
      part: "Front Matter",
      settings,
      blocks: [
        {
          id: blockId(num, "toc"),
          type: "toc",
          columns: 1,
          entries: tocEntries,
        },
      ],
    };
  }

  /* P004 — Prólogo com arte vertical + texto principal. */
  if (num === 4) {
    settings.header = true;
    settings.pageNumber = true;
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "chapter_opening",
      variant: "image-top",
      title: f.title,
      eyebrow: "PRÓLOGO",
      part: "Parte I",
      chapter: "A velha e a Fresta",
      settings,
      blocks: [
        imageBlock(num, HERO_ASSETS[4], "A velha e a Fresta — vinheta P004", {
          position: "top",
          fit: "contain",
          width: "100%",
          height: "60mm",
        }),
        textBlock(num, f.body, "body", { align: "justify" }),
      ],
    };
  }

  /* P005 — Abertura de Parte: imagem monumental + bloco curto */
  if (num === 5) {
    settings.header = true;
    settings.pageNumber = true;
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "part_opening",
      title: "O Cristal Partido",
      eyebrow: "PARTE I",
      part: "Parte I",
      chapter: "O Cristal Partido",
      settings,
      blocks: [
        imageBlock(num, HERO_ASSETS[5], "O Cristal Partido — abertura da Parte I", {
          position: "full",
          fullBleed: true,
          fit: "cover",
        }),
        textBlock(num, f.body, "body", { align: "start", width: "92mm" }),
      ],
    };
  }

  /* P015 — Página de respiração deliberada (sem texto, sem arte) */
  if (num === 15) {
    settings.header = false;
    settings.pageNumber = true;
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "narrative",
      title: f.title,
      eyebrow: "TRANSIÇÃO",
      part: "Parte I",
      settings,
      blocks: [{ id: blockId(num, "div-1"), type: "divider", ornament: false }],
    };
  }

  /* P016 — Abertura tipográfica sem arte */
  if (num === 16) {
    settings.pageNumber = true;
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "narrative",
      title: "História do Mundo Partido",
      eyebrow: "HISTÓRIA",
      part: "Parte I",
      chapter: "História do Mundo Partido",
      settings,
      blocks: [
        headingBlock(num, 2, "HISTÓRIA DO MUNDO PARTIDO", "ABERTURA"),
        textBlock(num, f.body, "lead", { align: "start", width: "88mm" }),
      ],
    };
  }

  /* P018 — Povos e Reinos (sem arte; diagrama editorial adiado para lote futuro) */
  if (num === 18) {
    settings.header = true;
    settings.pageNumber = true;
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "narrative",
      title: "Povos e Reinos",
      eyebrow: "HISTÓRIA",
      part: "Parte I",
      chapter: "Povos e Reinos",
      settings,
      blocks: [
        headingBlock(num, 2, "POVOS E REINOS", "HISTÓRIA"),
        textBlock(num, f.body, "body", { align: "justify" }),
      ],
    };
  }

  /* P023 — ART_PENDING_REVIEW: sem imagem, página tipográfica. */
  if (num === 23) {
    settings.header = true;
    settings.pageNumber = true;
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "narrative",
      title: f.title,
      eyebrow: "HISTÓRIA",
      part: "Parte I",
      chapter: "O Programa de Substituição",
      settings,
      blocks: [
        headingBlock(num, 2, "O PROGRAMA DE SUBSTITUIÇÃO", "ART_PENDING_REVIEW"),
        textBlock(num, f.body, "body", { align: "justify" }),
      ],
    };
  }

  /* P030 — Fechamento tipográfico com 4 blocos leves (heading + body intercalados). */
  if (num === 30) {
    settings.header = true;
    settings.pageNumber = true;
    /* Quatro seções fixas: heading em caps + corpo (um ou mais parágrafos). */
    const SECTIONS = [
      "FUNDAMENTOS",
      "HISTÓRIA CONSENSUAL",
      "TRADIÇÕES E HIPÓTESES",
      "FUTURO ABERTO",
    ];
    const blocks = [];
    SECTIONS.forEach((heading, i) => {
      const next = SECTIONS[i + 1];
      const start = f.body.indexOf(heading);
      const end = next ? f.body.indexOf(next) : f.body.length;
      const segment = f.body.slice(start + heading.length, end).trim();
      blocks.push({ ...headingBlock(num, 3, heading), id: blockId(num, `h-${i + 1}`) });
      blocks.push({
        ...textBlock(num, segment, "body", { align: "start" }),
        id: blockId(num, `t-${i + 1}`),
      });
    });
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "narrative",
      title: f.title,
      eyebrow: "FECHAMENTO",
      part: "Parte I",
      chapter: "O que sabemos — e o que ainda pode mudar",
      settings,
      blocks,
    };
  }

  /* Páginas com arte vertical (P006–P014, P017, P019–P020) e spreads. */
  const isSpread = [8, 9, 21, 22, 24, 25, 26, 27, 28, 29].includes(num);
  const heroAsset = HERO_ASSETS[num];
  const spreadAsset = SPREAD_ASSETS[num];
  const asset = heroAsset ?? spreadAsset;
  settings.header = true;
  settings.pageNumber = true;

  if (isSpread) {
    /* Spread: a arte horizontal é uma única composição; cada página
       mostra apenas a sua metade (esquerda ou direita) através de
       object-position, preservando continuidade visual através do gutter
       sem duplicar a imagem. O PDF do miolo continua exportando páginas
       físicas individuais de 150 × 220 mm — a imposição em folha
       dupla é responsabilidade da gráfica. */
    const role = num % 2 === 0 ? "left" : "right";
    const objectX = role === "left" ? 0 : 100;
    const objectY = 50;
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "chapter_opening",
      variant: "image-side",
      title: f.title,
      eyebrow: role === "left" ? "PARTE I · METADE ESQUERDA" : "PARTE I · METADE DIREITA",
      part: "Parte I",
      chapter: f.title,
      settings,
      blocks: [
        imageBlock(num, asset, `${f.title} — spread ${role}`, {
          position: "left",
          fit: "cover",
          width: "100%",
          height: "100%",
          objectX,
          objectY,
        }),
        textBlock(num, f.body, "body", { align: "justify" }),
      ],
    };
  }

  /* Página com arte vertical (vinheta ou hero). */
  if (heroAsset) {
    return {
      id: `p-${String(num).padStart(3, "0")}`,
      template: "chapter_opening",
      variant: "image-top",
      title: f.title,
      eyebrow: "PARTE I",
      part: "Parte I",
      chapter: f.title,
      settings,
      blocks: [
        imageBlock(num, heroAsset, `${f.title} — vinheta P${num}`, {
          position: "top",
          fit: "contain",
          width: "100%",
          height: "62mm",
        }),
        textBlock(num, f.body, "body", { align: "justify" }),
      ],
    };
  }

  /* Página só-texto (não deve ocorrer para P001–P030 fora dos casos acima,
     mas previne regressão silenciosa). */
  return {
    id: `p-${String(num).padStart(3, "0")}`,
    template: "narrative",
    title: f.title,
    part: "Parte I",
    chapter: f.title,
    settings,
    blocks: [textBlock(num, f.body, "body", { align: "justify" })],
  };
}

/* ---------- 5. Páginas estruturais P031–P280 ---------------------------- */
function structuralPage(num) {
  return {
    id: `p-${String(num).padStart(3, "0")}`,
    template: "narrative",
    title: `P${String(num).padStart(3, "0")}`,
    eyebrow: "PENDENTE",
    part: "Estrutura do livro",
    settings: {
      header: false,
      footer: false,
      pageNumber: false,
      columns: 1,
      background: "paper",
      fullBleed: false,
    },
    blocks: [
      {
        id: blockId(num, "t"),
        type: "text",
        role: "note",
        content: `P${String(num).padStart(3, "0")} — página estrutural preservada. Conteúdo não materializado nesta missão.`,
      },
    ],
  };
}

/* ---------- 6. Compor o livro ------------------------------------------- */
const INTERIOR_PAGES = 280;
const MATERIALIZED = 30;
const pages = [];
for (let n = 1; n <= INTERIOR_PAGES; n += 1) {
  pages.push(n <= MATERIALIZED ? pageFor(n) : structuralPage(n));
}

/* ---------- 7. Spreads editoriais --------------------------------------- */
const spreads = [
  {
    left: 8,
    right: 9,
    asset: "/assets/handoff/approved/p008_009_luz_escuridao_sombra_pb.png",
    alt: "Luz, Escuridão e Sombra — spread P008-P009",
  },
  {
    left: 21,
    right: 22,
    asset: "/assets/handoff/approved/p021_022_kethrell_faccao_cientifica_pb.jpg",
    alt: "Facção Científica / Kethrell — spread P021-P022",
  },
  {
    left: 24,
    right: 25,
    asset: "/assets/handoff/approved/p024_025_outros_lightbringers_pb.jpg",
    alt: "Os Outros / Lightbringers — spread P024-P025",
  },
  {
    left: 26,
    right: 27,
    asset: "/assets/handoff/approved/p026_027_daeren_thavin_isenna_pb.jpg",
    alt: "Daeren, Thavin e Isenna — spread P026-P027",
  },
  {
    left: 28,
    right: 29,
    asset: "/assets/handoff/approved/p028_029_thaeraen_tempo_escolha_pb.jpeg",
    alt: "Thaeraen / Tempo da Escolha — spread P028-P029",
  },
];

/* ---------- 8. Árvore de nós do livro ----------------------------------- */
const front = {
  id: "node-front",
  label: "Front Matter",
  kind: "front",
  pageIds: ["p-001", "p-002", "p-003"],
};
const part1 = {
  id: "node-part-1",
  label: "Parte I — O Cristal Partido",
  kind: "part",
  pageIds: pages.slice(3, 30).map((p) => p.id) /* P004–P030 */,
};
const cint = {
  id: "node-cinturao",
  label: "O Cinturão das Frestas",
  kind: "chapter",
  pageIds: ["p-031"],
};
const part2 = {
  id: "node-part-2",
  label: "Parte II — Pessoas, Povos e Caminhos",
  kind: "part",
  pageIds: pages.slice(31, 100).map((p) => p.id) /* P032–P100 */,
};
const part3 = {
  id: "node-part-3",
  label: "Parte III — Regras de Jogo",
  kind: "part",
  pageIds: pages.slice(100, 170).map((p) => p.id) /* P101–P170 */,
};
const part4 = {
  id: "node-part-4",
  label: "Parte IV — Equipamento, Artefato e Transformação",
  kind: "part",
  pageIds: pages.slice(170, 230).map((p) => p.id) /* P171–P230 */,
};
const part5 = {
  id: "node-part-5",
  label: "Parte V — Conduzir KALLISTIS",
  kind: "part",
  pageIds: pages.slice(230, 275).map((p) => p.id) /* P231–P275 */,
};
const apendices = {
  id: "node-apendices",
  label: "Apêndices",
  kind: "appendix",
  pageIds: pages.slice(275, 280).map((p) => p.id) /* P276–P280 */,
};

/* ---------- 9. Compor o JSON final -------------------------------------- */
const book = {
  schemaVersion: 1,
  meta: {
    title: "KALLISTIS — Livro Básico",
    subtitle: "O Cristal e a Fresta",
    author: "Antônio de Oliveira",
    imprint: "Nomos Ludens",
    edition: "Definitiva v1.3",
    firstFolio: 1,
  },
  tokens: {
    pageWidth: "140mm",
    pageHeight: "210mm",
    bleed: "5mm",
    marginInner: "16mm",
    marginOuter: "12mm",
    marginTop: "14mm",
    marginBottom: "16mm",
    columnGap: "6mm",
    bodySize: "10pt",
    bodyLeading: "13.5pt",
    rulesSize: "9.5pt",
    rulesLeading: "12.5pt",
    tableSize: "8.5pt",
    h1Size: "22pt",
    h2Size: "14pt",
    h3Size: "11pt",
  },
  nodes: [front, part1, cint, part2, part3, part4, part5, apendices],
  pages,
  spreads,
};

/* ---------- 10. Salvar -------------------------------------------------- */
writeFileSync(OUTPUT, `${JSON.stringify(book, null, 2)}\n`, "utf8");
console.log(`[build-p001-p030] wrote ${OUTPUT}`);
console.log(`  pages: ${pages.length}`);
console.log(`  materialized: ${MATERIALIZED}`);
console.log(`  structural: ${INTERIOR_PAGES - MATERIALIZED}`);
console.log(`  spreads: ${spreads.length}`);
console.log(`  P023 art_status: PENDING_REVIEW (sem bloco de imagem)`);
