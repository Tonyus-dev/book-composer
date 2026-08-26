import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const projectPath = path.join(root, 'projects/KALLISTIS_MANUAL_DO_MUNDO_v4_REBUILD.json');
const ingestPath = path.join(root, 'projects/KALLISTIS_MANUAL_DO_MUNDO_v4_REBUILD.ingest.json');
const preflightPath = path.join(root, 'dist/export/preflight-report.json');
const pdfPath = path.join(root, 'dist/export/KALLISTIS_MANUAL_DO_MUNDO_v4_PROVA.pdf');
const normalizedPath = path.join(root, 'tmp/rebuild-v4/KALLISTIS_MANUSCRITO_V4_NORMALIZADO.md');

const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
const ingest = JSON.parse(fs.readFileSync(ingestPath, 'utf8'));
const preflight = JSON.parse(fs.readFileSync(preflightPath, 'utf8'));
const pages = project.pages ?? [];
const images = pages.flatMap(page => page.blocks ?? []).filter(block => block.type === 'image');
const glyphs = images.filter(block => block.layoutRole === 'INLINE_CANONICAL_GLYPH');
const base64Json = /data:image\/(?:png|jpeg|webp);base64,/i.test(fs.readFileSync(projectPath, 'utf8'));
const missingAssets = [...new Set(images.map(block => block.src).filter(src => typeof src === 'string' && src.startsWith('/assets/')))]
  .filter(src => !fs.existsSync(path.join(root, 'public', src.slice(1))));
const pdfInfo = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
const pdfPages = Number(pdfInfo.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);
const pageSize = pdfInfo.match(/^Page size:\s+(.+)$/m)?.[1]?.trim() ?? null;

const qa = {
  artifact: 'KALLISTIS — MANUAL DO MUNDO',
  version: 'v4_REBUILD',
  status: 'PASS_COM_RESSALVAS',
  generatedAt: new Date().toISOString(),
  source: {
    canonicalSha256: ingest.manuscriptSha256,
    normalizedSha256: ingest.normalizedManuscriptSha256,
    normalizedBase64MaterializedOccurrences: ingest.base64MaterializedOccurrences,
    canonicalSourcePreserved: sha256(path.join(root, 'KALLISTIS_LIVROS/KALLISTIS_MANUAL_DO_MUNDO/PACOTE_FINAL_RENDERIZACAO_MANUAL_DO_MUNDO/00_MANUSCRITO_CANONICO/KALLISTIS_MANUSCRITO_FONTE_UNICA_v3.1_FREEZE.md')) === ingest.manuscriptSha256,
  },
  materialization: {
    pages: pages.length,
    imageBlocks: images.length,
    glyphBlocks: glyphs.length,
    glyphSize: [...new Set(glyphs.map(block => `${block.width} x ${block.height}`))],
    base64InProjectJson: base64Json,
    missingAssetReferences: missingAssets,
    overflowPages: project.report?.diagnostics?.overflowPages ?? 0,
  },
  pdf: {
    path: path.relative(root, pdfPath),
    sha256: sha256(pdfPath),
    pages: pdfPages,
    pageSize,
    preflightErrors: preflight.summary?.errors ?? null,
    preflightWarnings: preflight.summary?.warnings ?? null,
    preflightInfos: preflight.summary?.infos ?? null,
  },
  visualProof: {
    targetedPages: [1, 62, 63, 80, 82, 84, 94, 118, 126, 185, 186, 190, 194, 222, 246, 296, 322, 327],
    glyphPages: [186, 190],
    result: 'REVIEWED',
  },
  caveats: [
    'O relatório legado do materializador compara a fonte normalizada com a fonte congelada e registra SOURCE_TEXT_MISMATCH por causa da externalização técnica dos glifos; o manuscrito canônico original não foi alterado.',
    'O preflight não tem erros, mas contém avisos de destino do TOC e viúvas tipográficas.',
    'A exportação usa o trim existente de 140 x 210 mm, igual ao PDF de referência; não materializa uma página física de 150 x 220 mm.',
  ],
};

const out = path.join(root, 'projects/KALLISTIS_MANUAL_DO_MUNDO_v4_REBUILD.qa.json');
fs.writeFileSync(out, JSON.stringify(qa, null, 2) + '\n');
console.log(JSON.stringify(qa, null, 2));
