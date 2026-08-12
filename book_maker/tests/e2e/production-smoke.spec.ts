import { expect, test } from "playwright/test";
import { readFile, stat } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const storageKey = "kallistis.book-builder.project.v2.default";
const svg = (width: number, height: number, color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/></svg>`;
const inline = `data:image/svg+xml;base64,${Buffer.from(svg(40, 40, "#123")).toString("base64")}`;

function crc32(input: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function png(width: number, height: number, rgb: readonly [number, number, number]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const name = Buffer.from(type, "ascii");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([length, name, data, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) row.set(rgb, 1 + x * 3);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const fixture = {
  schemaVersion: 1,
  meta: {
    title: "KALLISTIS — Livro Básico",
    subtitle: "O Cristal e a Fresta",
    author: "Antônio de Oliveira",
    imprint: "Nomos Ludens",
    edition: "Teste",
    firstFolio: 1,
  },
  tokens: {
    pageWidth: "140mm",
    pageHeight: "210mm",
    bleed: "5mm",
    marginTop: "15mm",
    marginBottom: "17mm",
    marginInner: "18mm",
    marginOuter: "14mm",
    columns: 1,
    columnGap: "5mm",
    baseline: "4mm",
    bodySize: "10pt",
    bodyLeading: "14pt",
    smallSize: "8pt",
    smallLeading: "11pt",
    tableSize: "8pt",
    h1Size: "32pt",
    h2Size: "22pt",
    h3Size: "15pt",
    fontDisplay: "serif",
    fontBody: "serif",
    fontFunctional: "sans-serif",
  },
  nodes: [{ id: "front", label: "Capa", kind: "front", pageIds: ["cover"] }],
  pages: [
    {
      id: "cover",
      template: "cover",
      variant: "default",
      title: "KALLISTIS — Livro Básico",
      subtitle: "O Cristal e a Fresta",
      settings: {
        header: false,
        footer: false,
        pageNumber: false,
        columns: 1,
        background: "obsidian",
        fullBleed: true,
      },
      blocks: [
        {
          id: "cover-art",
          type: "image",
          src: "/assets/cover/capa-cristal.jpg",
          alt: "Capa canônica",
          position: "full",
          fullBleed: true,
          fit: "cover",
        },
        {
          id: "cover-lockup",
          type: "lockup",
          variant: "lockup",
          src: "/assets/branding/KALLISTIS_lockup_master.jpg",
          alt: "Lockup",
        },
      ],
    },
  ],
  assets: [
    {
      id: "legacy",
      label: "Legado",
      category: "characters",
      data: inline,
      mime: "image/svg+xml",
      bytes: inline.length,
      pixelWidth: 40,
      pixelHeight: 40,
      createdAt: "2026-08-11T00:00:00.000Z",
    },
  ],
};

async function seedBookOnce(page: import("playwright/test").Page) {
  await page.goto("/login");
  await page.evaluate(
    ({ key, value }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: storageKey,
      value: fixture,
    },
  );
}

test("editor, canonical cover migration, IndexedDB assets, reload, offline and print", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seedBookOnce(page);
  await page.goto("/");
  const editorCover = page.locator(".k-editor-page[data-page-id='cover']");
  await expect(editorCover).toBeVisible();
  await expect(
    editorCover.locator(".k-cover__product, .k-cover__sub, .k-cover__foot, .k-cover__lockup-slot"),
  ).toHaveCount(0);
  const coverMode = page.getByLabel("Composição da capa");
  await coverMode.selectOption("overlay");
  await expect(editorCover.locator(".k-cover__product")).toBeVisible();
  await expect(editorCover.locator(".k-cover__sub")).toBeVisible();
  await coverMode.selectOption("art-only");
  await expect(
    editorCover.locator(".k-cover__product, .k-cover__sub, .k-cover__foot, .k-cover__lockup-slot"),
  ).toHaveCount(0);

  const input = page.locator('input[type="file"][accept*="image/jpeg"]');
  const applyRaster = async (
    name: string,
    width: number,
    height: number,
    color: readonly [number, number, number],
  ) => {
    await input.setInputFiles({
      name,
      mimeType: "image/png",
      buffer: png(width, height, color),
    });
    await page.getByTitle(name.slice(0, -4), { exact: true }).click();
  };

  await applyRaster("A.png", 100, 100, [220, 20, 20]);
  await page.getByRole("button", { name: "Preflight", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Preflight", exact: true })).toBeVisible();
  await expect(page.getByText("estático + medições de layout", { exact: true })).toBeVisible();
  const lowResolutionRow = page.locator('[data-preflight-rule="image-low-resolution"]');
  await expect(lowResolutionRow).toHaveCount(1);
  await expect(lowResolutionRow).toHaveAttribute("data-preflight-severity", "error");
  await expect(lowResolutionRow).toContainText(/Imagem com \d+ ppi efetivos/);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();

  await applyRaster("B.png", 800, 1200, [20, 180, 60]);
  await applyRaster("C.png", 1800, 2700, [20, 70, 220]);
  const coverImages = editorCover.locator(".k-bleed--img");
  await expect(coverImages).toHaveCount(1);
  await expect(coverImages).toHaveAttribute("src", /^blob:/);
  await expect(coverImages).toHaveJSProperty("naturalWidth", 1800);
  await page.getByRole("button", { name: "Preflight", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Preflight", exact: true })).toBeVisible();
  await expect(page.getByText("estático + medições de layout", { exact: true })).toBeVisible();
  await expect(page.locator('[data-preflight-rule="image-low-resolution"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();

  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        const reference = saved.pages[0]?.blocks[0]?.src;
        const assetId = typeof reference === "string" ? reference.replace(/^asset:/, "") : "";
        return saved.assets?.find((asset: { id?: string }) => asset.id === assetId)?.label ?? null;
      }, storageKey),
    )
    .toBe("C");
  const persisted = await page.evaluate((key) => localStorage.getItem(key) ?? "", storageKey);
  expect(persisted).not.toContain("data:image/");
  expect(persisted.length).toBeLessThan(30_000);
  expect(JSON.parse(persisted).pages[0].coverMode).toBe("art-only");

  await page.reload();
  await expect(coverImages).toHaveAttribute("src", /^blob:/);
  await expect(coverImages).toHaveJSProperty("naturalWidth", 1800);
  await page.route("**/*", (route) =>
    route.request().resourceType() === "image" ? route.abort() : route.continue(),
  );
  await page.reload();
  await expect(coverImages).toHaveJSProperty("naturalWidth", 1800);

  await page.goto("/print");
  await expect(page.locator("html")).toHaveAttribute("data-print-ready", "true");
  await expect(
    page.locator(".k-cover__product, .k-cover__sub, .k-cover__foot, .k-cover__lockup-slot"),
  ).toHaveCount(0);
  await expect(page.locator(".k-bleed--img")).toHaveAttribute("src", /^blob:/);
  const output = testInfo.outputPath("externalized-fixture.pdf");
  await page.pdf({ path: output, printBackground: true, preferCSSPageSize: true });
  const pdf = await readFile(output);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(fixture.pages.length);
  expect(errors).toEqual([]);
});

test("real PDF accepts legacy portable JSON and has the fixture page count", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.addInitScript((book) => {
    window.__KALLISTIS_BOOK__ = book;
  }, fixture);
  await page.goto("/print");
  await expect(page.locator("html")).toHaveAttribute("data-print-ready", "true");
  const output = testInfo.outputPath("legacy-fixture.pdf");
  await page.pdf({ path: output, printBackground: true, preferCSSPageSize: true });
  const bytes = await readFile(output);
  expect((await stat(output)).size).toBeGreaterThan(0);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(fixture.pages.length);
  expect(consoleErrors.filter((message) => /Hydration failed/i.test(message))).toEqual([]);
});

test("blank is empty and preserves a manual composition in reload, print and PDF", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await seedBookOnce(page);
  await page.goto("/");
  const blankAddButtons = page.getByRole("button", {
    name: "Adicionar Página em branco depois",
    exact: true,
  });
  await expect(blankAddButtons).toHaveCount(1);
  await blankAddButtons.click();
  await expect(blankAddButtons).toHaveCount(2);
  const blankThumbnail = page.locator("button .k-page[data-template='blank']");
  await blankThumbnail.locator("xpath=ancestor::button[1]").click();
  const blankPage = page.locator(".k-editor-page[data-template='blank']");
  await expect(blankPage).toBeVisible();
  await expect(blankPage.locator("[data-block-id]")).toHaveCount(0);
  await expect(blankPage.locator(".k-page__content, .k-page-number, .k-page-header")).toHaveCount(
    0,
  );

  const insert = page.getByLabel("Inserir bloco", { exact: true });
  await insert.selectOption("heading");
  await page.getByLabel("X (mm)").fill("8");
  await page.getByLabel("Y (mm)").fill("8");
  await insert.selectOption("text");
  await page.getByLabel("X (mm)").fill("12");
  await page.getByLabel("Y (mm)").fill("180");
  await insert.selectOption("image");
  await page.locator('input[type="file"][accept*="image/jpeg"]').setInputFiles({
    name: "blank-center.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(svg(1200, 1200, "purple")),
  });
  await page.getByTitle("blank-center", { exact: true }).click();
  await page.getByLabel("X (mm)").fill("45");
  await page.getByLabel("Y (mm)").fill("70");
  await page.getByText("Inserir elemento ▾", { exact: true }).click();
  await page.getByRole("button", { name: "Área de cor" }).click();
  await page.getByLabel("X (mm)").fill("40");
  await page.getByLabel("Y (mm)").fill("65");
  await page.getByRole("button", { name: "↑ subir" }).click();

  await expect(blankPage.locator(".k-block--heading")).toHaveCSS("left", /px/);
  await expect(blankPage.locator(".k-block--text")).toHaveCSS("top", /px/);
  await expect(blankPage.locator(".k-block--image")).toHaveCount(1);
  await expect(blankPage.locator(".k-block--shape")).toHaveCount(1);
  await expect(blankPage.locator("[data-block-id]")).toHaveCount(4);
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const blank = JSON.parse(raw).pages.find(
          (candidate: { template?: string }) => candidate.template === "blank",
        );
        return blank?.blocks?.length ?? null;
      }, storageKey),
    )
    .toBe(4);
  await expect(page.getByTitle("O autosave local continua ativo mesmo sem a nuvem.")).toContainText(
    "salvo localmente",
  );
  const savedBook = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    storageKey,
  );
  const savedBlank = savedBook.pages.find(
    (candidate: { template?: string }) => candidate.template === "blank",
  );
  expect(savedBlank.blocks).toHaveLength(4);
  expect(
    savedBlank.blocks.map((block: { frame?: unknown }) => block.frame).filter(Boolean),
  ).toHaveLength(4);
  await page.reload();
  await expect(blankAddButtons).toHaveCount(2);
  await blankThumbnail.locator("xpath=ancestor::button[1]").click();
  await expect(blankPage.locator("[data-block-id]")).toHaveCount(4);
  await expect(blankPage.locator(".k-block--text")).toHaveAttribute("style", /top: 180mm/);

  await page.goto("/print");
  await expect(page.locator("html")).toHaveAttribute("data-print-ready", "true");
  const printedBlank = page.locator(".k-page[data-template='blank']");
  await expect(printedBlank.locator("[data-block-id]")).toHaveCount(4);
  await expect(page.locator('img[src=""]')).toHaveCount(0);
  await expect(
    page.locator("[class*='k-editor-'], [data-testid='block-drag-surface']"),
  ).toHaveCount(0);
  const output = testInfo.outputPath("blank-manual-composition.pdf");
  await page.pdf({ path: output, printBackground: true, preferCSSPageSize: true });
  const pdf = await readFile(output);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(0);
  expect(consoleErrors.filter((message) => /empty string.*src attribute/i.test(message))).toEqual(
    [],
  );
});
