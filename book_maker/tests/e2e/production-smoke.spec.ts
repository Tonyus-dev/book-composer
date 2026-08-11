import { expect, test } from "playwright/test";
import { readFile, stat } from "node:fs/promises";

const storageKey = "kallistis.book-builder.project.v2.default";
const svg = (width: number, height: number, color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/></svg>`;
const inline = `data:image/svg+xml;base64,${Buffer.from(svg(40, 40, "#123")).toString("base64")}`;

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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: storageKey,
    value: fixture,
  });
});

test("editor, canonical cover migration, IndexedDB assets, reload, offline and print", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".k-page[data-page-id='cover']")).toBeVisible();
  await expect(
    page.locator(".k-cover__product, .k-cover__sub, .k-cover__foot, .k-cover__lockup-slot"),
  ).toHaveCount(0);
  const coverMode = page.getByLabel("Composição da capa");
  await coverMode.selectOption("overlay");
  await expect(page.locator(".k-cover__product")).toBeVisible();
  await expect(page.locator(".k-cover__sub")).toBeVisible();
  await coverMode.selectOption("art-only");
  await expect(
    page.locator(".k-cover__product, .k-cover__sub, .k-cover__foot, .k-cover__lockup-slot"),
  ).toHaveCount(0);

  const input = page.locator('input[type="file"][accept*="image/jpeg"]');
  for (const [name, width, height, color] of [
    ["A.svg", 100, 100, "red"],
    ["B.svg", 500, 500, "green"],
    ["C.svg", 3000, 4400, "blue"],
  ] as const) {
    await input.setInputFiles({
      name,
      mimeType: "image/svg+xml",
      buffer: Buffer.from(svg(width, height, color)),
    });
    await page.getByTitle(name.slice(0, -4)).click();
    if (name === "A.svg") {
      await page.getByRole("button", { name: "Preflight", exact: true }).first().click();
      await expect(page.getByText(/baixa resolução/i).first()).toBeVisible();
    }
  }
  const coverImages = page.locator(".k-page[data-page-id='cover'] .k-bleed--img");
  await expect(coverImages).toHaveCount(1);
  await expect(coverImages).toHaveAttribute("src", /^blob:/);
  await expect(coverImages).toHaveJSProperty("naturalWidth", 3000);

  await page.waitForTimeout(700);
  const persisted = await page.evaluate((key) => localStorage.getItem(key) ?? "", storageKey);
  expect(persisted).not.toContain("data:image/");
  expect(persisted.length).toBeLessThan(30_000);
  expect(JSON.parse(persisted).pages[0].coverMode).toBe("art-only");

  await page.reload();
  await expect(coverImages).toHaveAttribute("src", /^blob:/);
  await expect(coverImages).toHaveJSProperty("naturalWidth", 3000);
  await page.route("**/*", (route) =>
    route.request().resourceType() === "image" ? route.abort() : route.continue(),
  );
  await page.reload();
  await expect(coverImages).toHaveJSProperty("naturalWidth", 3000);

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
});
