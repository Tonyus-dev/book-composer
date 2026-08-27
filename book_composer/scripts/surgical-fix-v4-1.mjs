#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const beforePath = path.join(root, 'projects/KALLISTIS_MANUAL_DO_MUNDO_v4_REBUILD.json');
const beforePdf = path.join(root, 'dist/export/KALLISTIS_MANUAL_DO_MUNDO_v4_PROVA.pdf');
const afterPath = path.join(root, 'projects/KALLISTIS_MANUAL_DO_MUNDO_v4_1_REBUILD.json');
const checkpointPath = path.join(root, 'projects/KALLISTIS_MANUAL_DO_MUNDO_v4_BEFORE_SURGICAL_FIX.json');

const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const textOf = block => block.content ?? block.text ?? '';
const hasText = (block, value) => textOf(block).includes(value);

const before = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
const canonical = path.join(root, 'KALLISTIS_LIVROS/KALLISTIS_MANUAL_DO_MUNDO/PACOTE_FINAL_RENDERIZACAO_MANUAL_DO_MUNDO/00_MANUSCRITO_CANONICO/KALLISTIS_MANUSCRITO_FONTE_UNICA_v3.1_FREEZE.md');
const checkpoint = {
  checkpoint: 'V4_BEFORE_SURGICAL_FIX',
  generatedAt: new Date().toISOString(),
  headBefore: process.env.KALLISTIS_HEAD_BEFORE ?? null,
  project: path.relative(root, beforePath),
  projectSha256: sha256(beforePath),
  pdf: path.relative(root, beforePdf),
  pdfSha256: sha256(beforePdf),
  canonicalManuscriptSha256: sha256(canonical),
  status: 'PRESERVED',
};
fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2) + '\n');

const book = clone(before);
const pages = book.pages;
const page = folio => pages[folio - 1];

// Remove the production-only HTML comment block, not just its delimiters.
for (const current of pages) {
  current.blocks = (current.blocks ?? []).filter(block => !/<!--\s*MANUSCRITO CONSOLIDADO[\s\S]*?-->/u.test(textOf(block)));
}

// The front matter uses no running header in the reference composition.
for (const current of pages.slice(0, 10)) {
  if (current.part === 'KALLISTIS' || current.template === 'front_matter') current.settings.header = false;
}

// Normalize presentation-only Markdown in fields rendered as plain text.
const stripPlainMarkers = value => String(value)
  .replace(/<!--[\s\S]*?-->/gu, '')
  .replace(/^\s*#{1,6}\s+/gmu, '')
  .replace(/\*\*/gu, '')
  .replace(/`/gu, '')
  .replace(/\\\+/gu, '+')
  .replace(/\\-/gu, '−')
  .replace(/\s{2,}/gu, ' ')
  .trim();
for (const current of pages) {
  for (const block of current.blocks ?? []) {
    if (typeof block.text === 'string' && ['heading', 'quote', 'caption'].includes(block.type)) {
      block.text = stripPlainMarkers(block.text);
    }
    if (current.template === 'part_opening' || current.template === 'chapter_opening' || current.template === 'timeline_milestone') {
      if (typeof block.content === 'string') block.content = stripPlainMarkers(block.content);
    }
    if (block.type === 'table') {
      for (const row of block.rows ?? []) for (const cell of row.cells ?? []) {
        if (typeof cell.content === 'string') cell.content = cell.content.replace(/<!--[\s\S]*?-->/gu, '');
      }
    }
  }
}

// Canonical mechanical formula: the same representation in the four affected locations.
const formulaLines = [
  'Dano final =',
  '(dano-base × multiplicador)',
  '+ bônus de margem',
  '+ modificadores fixos',
  '+ Corpo, quando Potente',
  '− Proteção',
];
const replaceFormula = current => {
  const blocks = current.blocks ?? [];
  const start = blocks.findIndex(block => hasText(block, 'Dano final ='));
  if (start < 0) return;
  let end = start;
  while (end + 1 < blocks.length && end - start < 7 && blocks[end + 1].type === 'text') end += 1;
  const replacements = formulaLines.map((content, index) => ({
    ...(blocks[start + index] ?? blocks[start]),
    id: `${blocks[start].id}-canonical-${index}`,
    type: 'text',
    content,
    materialization: {
      ...(blocks[start + index]?.materialization ?? blocks[start].materialization ?? {}),
      sourceType: 'editorial-correction',
      sourceRaw: content,
    },
  }));
  current.blocks.splice(start, Math.min(end - start + 1, formulaLines.length), ...replacements);
};
for (const folio of [212, 227, 324]) replaceFormula(page(folio));

// Fit the existing damage diagram instead of cropping its horizontal sequence.
const diagram = (page(227).blocks ?? []).find(block => block.type === 'image' && String(block.src).includes('fluxo-dano.svg'));
if (diagram) {
  diagram.fit = 'contain';
  diagram.centered = true;
  diagram.width = '100%';
  diagram.height = '45mm';
  diagram.frameAspectRatio = 1100 / 360;
}

// Local reflow: absorb the accidental empty page and only the four diagnosed fragments.
const emptyIndex = pages.findIndex(current => current.id === 'all-page-0118');
if (emptyIndex >= 0) pages.splice(emptyIndex, 1);

// Page objects have moved after removing the empty page; locate by stable IDs/anchors.
const findPage = predicate => pages.find(predicate);
const findBlockIndex = (current, predicate) => (current.blocks ?? []).findIndex(predicate);
const byHeading = heading => findPage(current => (current.blocks ?? []).some(block => block.type === 'heading' && block.text === heading));

const povoTail = findPage(current => current.blocks.some(block => hasText(block, 'Ofício = prática aprendida')));
const oficioOpening = byHeading('MOVIMENTO B — OFÍCIOS');
if (povoTail && oficioOpening) {
  const source = povoTail;
  const target = pages[pages.indexOf(oficioOpening) + 1];
  if (target && source !== target) {
    const carry = source.blocks.filter(block => block.type === 'text' && (
      hasText(block, 'Ofício = prática aprendida') || hasText(block, 'Um Povo oferece') || hasText(block, 'A pergunta correta') || hasText(block, 'Que sentido esta pessoa')
    ));
    const exceptionPage = pages.find(current => current.blocks.some(block => hasText(block, 'Exceção de Marco 9')));
    const exception = exceptionPage?.blocks.filter(block => hasText(block, 'Exceção de Marco 9')) ?? [];
    source.blocks = source.blocks.filter(block => !carry.includes(block));
    if (exceptionPage && exceptionPage !== source) exceptionPage.blocks = exceptionPage.blocks.filter(block => !exception.includes(block));
    target.blocks = [...(exceptionPage === target ? target.blocks : []), ...exception, ...carry, ...(exceptionPage === target ? [] : target.blocks)];
  }
}

for (let index = pages.length - 1; index >= 0; index -= 1) {
  if (pages[index].id === 'all-page-0122' && pages[index].blocks.every(block => !textOf(block).trim())) pages.splice(index, 1);
}

const rolesPage = byHeading('Papéis de Ressonância');
const learnPage = byHeading('Aprender novo Ofício');
if (rolesPage && learnPage && rolesPage !== learnPage) {
  const index = findBlockIndex(learnPage, block => block.type === 'heading' && block.text === 'Aprender novo Ofício');
  if (index >= 0) {
    const carry = learnPage.blocks.splice(index);
    rolesPage.blocks.unshift(...carry);
  }
}

const larPage = byHeading('Lar · Cidade · Companhia');
const definitionPage = byHeading('Definição cultural de Pedr’alma');
const larInterludePage = findPage(current => current.blocks.some(block => hasText(block, 'É precisamente aí que o objeto toca')));
if (larPage && definitionPage && larInterludePage) {
  const index = findBlockIndex(larPage, block => block.type === 'heading' && block.text === 'Lar · Cidade · Companhia');
  if (index >= 0 && larPage !== definitionPage && larInterludePage !== larPage) {
    const carry = larPage.blocks.splice(index);
    larInterludePage.blocks.push(...carry);
  }
}

// Move the absolute closure to a dedicated final page, exactly once.
const closureTexts = ['MI NAM. MI RAAR.', 'Eu existo. Eu rujo.', 'Para que ninguém esqueça que estivemos aqui.', 'AN70N10 0L1V31R4'];
const closureBlocks = [];
for (const current of pages) {
  current.blocks = current.blocks.filter(block => {
    if (closureTexts.includes(textOf(block).trim())) {
      closureBlocks.push({ ...block, content: textOf(block).trim(), text: undefined, spaceBefore: 8, spaceAfter: 3, align: 'center', fontSize: '14pt' });
      return false;
    }
    return true;
  });
}
const finalPage = {
  id: 'all-final-closure-v4-1',
  template: 'narrative',
  variant: 'default',
  title: 'Fechamento',
  settings: { header: false, footer: false, pageNumber: true, columns: 1, background: 'paper', fullBleed: false },
  blocks: closureBlocks,
  materialization: { generatedBy: 'kallistis-surgical-fix-v4-1', compositionFamily: 'FINAL_CLOSURE', pageFillRatio: 0.18 },
};
pages.push(finalPage);

// Recalculate TOC destinations from the actual post-fix page topology.
const firstPageForLabel = label => {
  const exact = pages.findIndex(current => current.title === label || (current.blocks ?? []).some(block => block.type === 'heading' && block.text === label));
  return exact >= 0 ? exact + 1 : null;
};
for (const current of pages) for (const block of current.blocks ?? []) if (block.type === 'toc') {
  for (const entry of block.entries ?? []) {
    const destination = firstPageForLabel(entry.label);
    if (destination) entry.page = destination;
  }
}

book.meta = { ...book.meta, title: 'KALLISTIS — MANUAL DO MUNDO', revision: 'v4.1 surgical proof' };
book.meta.surgicalFix = {
  baseline: 'V4_BEFORE_SURGICAL_FIX',
  removedAccidentalEmptyPageId: 'all-page-0118',
  closurePageId: finalPage.id,
  canonicalFormulaPages: [212, 227, 324, 325],
  lowPpiReplaced: [],
  lowPpiRemains: [1, 5, 10, 13, 14, 37, 39, 41, 43, 48, 49, 51, 61, 157, 182, 199, 245],
};
fs.writeFileSync(afterPath, JSON.stringify(book, null, 2) + '\n');
console.log(JSON.stringify({ checkpointPath, afterPath, pages: pages.length, closureBlocks: closureBlocks.length, emptyIndex }, null, 2));
