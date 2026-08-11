import { strict as assert } from "node:assert";
import { findPrimaryImage } from "../src/book/templates/types";
import { DEFAULT_TOKENS, type Book, type BookAsset, type ImageBlock } from "../src/book/types";
import { pixelsForPrint } from "../src/lib/assets/registry";
import { registerBookAssets } from "../src/lib/assets/registry";
import { effectiveImagePpi, staticIssues } from "../src/lib/preflight/static-rules";
import { bookSnapshot, normalizeBook, saveLocalBook } from "../src/lib/persistence/local";

const image = (id: string, src = `asset:${id}`): ImageBlock => ({
  id: `block-${id}`,
  type: "image",
  src,
  alt: id,
  position: "full",
  fullBleed: true,
});

function coverBook(
  pixelWidth: number,
  pixelHeight: number,
  coverMode: "art-only" | "overlay" = "art-only",
) {
  const asset: BookAsset = {
    id: "cover",
    label: "Cover",
    category: "cover",
    data: "data:image/png;base64,AA==",
    mime: "image/png",
    bytes: 1,
    pixelWidth,
    pixelHeight,
    createdAt: "2026-08-11T00:00:00.000Z",
  };
  const book: Book = {
    schemaVersion: 1,
    meta: {
      title: "Teste",
      subtitle: "",
      author: "Autor",
      imprint: "Editora",
      edition: "1",
      firstFolio: 1,
    },
    tokens: { ...DEFAULT_TOKENS, pageWidth: "140mm", pageHeight: "210mm", bleed: "5mm" },
    nodes: [],
    pages: [
      {
        id: "cover-page",
        template: "cover",
        coverMode,
        settings: {
          header: false,
          footer: false,
          pageNumber: false,
          columns: 1,
          background: "paper",
          fullBleed: true,
        },
        blocks: [image("cover")],
      },
    ],
    assets: [asset],
  };
  registerBookAssets(book.assets);
  return book;
}

function resolutionIssue(book: Book) {
  return staticIssues(book).find((issue) => issue.rule === "image-low-resolution");
}

assert.equal(pixelsForPrint(25.4), 300);

const low = coverBook(590, 866);
assert.equal(effectiveImagePpi(low, low.pages[0]!, low.pages[0]!.blocks[0] as ImageBlock), 100);
assert.equal(resolutionIssue(low)?.severity, "error");

const warning = coverBook(1181, 1732);
assert.equal(resolutionIssue(warning)?.severity, "warning");

const adequate = coverBook(1772, 2599);
assert.equal(resolutionIssue(adequate), undefined);

const legacy: ImageBlock = { id: "legacy", type: "image", src: "/legacy.jpg", alt: "Legacy" };
const cover = image("primary", "/cover.jpg");
assert.equal(findPrimaryImage([legacy, cover])?.id, cover.id);
assert.equal(findPrimaryImage([legacy])?.id, legacy.id);
const positioned = { ...image("positioned"), fullBleed: false };
assert.equal(findPrimaryImage([positioned, cover])?.id, cover.id);

let blocks: ImageBlock[] = [cover];
for (const src of ["/a.jpg", "/b.jpg", "/c.jpg"]) {
  const primary = findPrimaryImage(blocks)!;
  blocks = blocks.map((block) => (block.id === primary.id ? { ...block, src } : block));
}
assert.equal(blocks.length, 1);
assert.equal(findPrimaryImage(blocks)?.src, "/c.jpg");

const severalMegabytes = `data:image/png;base64,${"A".repeat(4 * 1024 * 1024)}`;
const externalized = coverBook(1772, 2599);
externalized.assets![0] = {
  ...externalized.assets![0]!,
  data: severalMegabytes,
  bytes: 3 * 1024 * 1024,
  storage: { kind: "local", key: "volume/cover" },
};
const lightweight = JSON.stringify(bookSnapshot(externalized));
assert.ok(lightweight.length < 10_000, `snapshot leve mediu ${lightweight.length} bytes`);
assert.ok(!lightweight.includes("data:image/"));

const canonicalLegacy = coverBook(1772, 2599, "overlay");
canonicalLegacy.meta.title = "KALLISTIS — Livro Básico";
delete canonicalLegacy.pages[0]!.coverMode;
(canonicalLegacy.pages[0]!.blocks[0] as ImageBlock).src = "/assets/cover/capa-cristal.jpg";
assert.equal(normalizeBook(canonicalLegacy).pages[0]!.coverMode, "art-only");
const genericLegacy = coverBook(1772, 2599, "overlay");
delete genericLegacy.pages[0]!.coverMode;
assert.equal(normalizeBook(genericLegacy).pages[0]!.coverMode, undefined);

const empty = coverBook(1772, 2599);
empty.pages[0]!.blocks = [];
registerBookAssets(empty.assets);
assert.ok(
  staticIssues(empty).some(
    (issue) =>
      issue.rule === "missing-asset" &&
      issue.severity === "error" &&
      issue.description.includes("art-only"),
  ),
);

const originalWindow = globalThis.window;
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
    },
  },
});
const originalConsoleError = console.error;
console.error = () => undefined;
const quotaSaveResult = saveLocalBook(adequate, "quota-test");
console.error = originalConsoleError;
assert.equal(quotaSaveResult, false);
if (originalWindow) {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
} else {
  delete (globalThis as { window?: Window }).window;
}

console.log("image production: ok");
