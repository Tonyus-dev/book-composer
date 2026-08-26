#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const sourcePath = path.join(root, 'projects/KALLISTIS_MANUAL_DO_MUNDO_v4_1_REBUILD.json');
const targetPath = path.join(root, 'projects/KALLISTIS_MANUAL_DO_MUNDO_v4_2_REBUILD.json');
const approvedAsset = '/home/tonyus-dev/Documents/KALLISTIS_COMPLETO/CANON_TUDO/imagens_curadoria/OPEN-006_CONDUZINDO_KALLISTIS_CANDIDATO (copy 1).png';
const publicAsset = path.join(root, 'public/assets/v1.5-acervo/a7ed1f3058911beb61e53614.png');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const book = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const approvedSha = sha256(approvedAsset);
const publicSha = sha256(publicAsset);
if (approvedSha !== publicSha) throw new Error(`Asset aprovado diverge do asset materializado: ${approvedSha} != ${publicSha}`);
const partPage = book.pages.find(page => page.id === 'all-page-0241');
const image = partPage?.blocks.find(block => block.type === 'image');
if (!image || image.src !== '/assets/v1.5-acervo/a7ed1f3058911beb61e53614.png') {
  throw new Error('A arte OPEN-006 não está preservada na abertura da Parte VI.');
}
book.meta = { ...book.meta, revision: 'v4.2 proof', sourceProof: 'v4.1 surgical proof promoted without editorial reimport' };
book.meta.v42Promotion = {
  baseProject: path.basename(sourcePath),
  approvedAssetSha256: approvedSha,
  materializedAssetSha256: publicSha,
  approvedAssetPageId: partPage.id,
  approvedAssetPageIndex: book.pages.indexOf(partPage) + 1,
  noCuratorialChange: true,
  noCanonicalTextChange: true,
};
fs.writeFileSync(targetPath, JSON.stringify(book, null, 2) + '\n');
console.log(JSON.stringify({ targetPath, pages: book.pages.length, approvedSha, pageId: partPage.id, pageIndex: book.pages.indexOf(partPage) + 1 }, null, 2));
