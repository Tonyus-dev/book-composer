import { expect, test } from "playwright/test";

const storageKey = "kallistis.book-builder.project.v2.default";

test("Free Canvas MVP compõe, transforma, amplia e persiste frames", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("frame-tool")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Páginas" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Assets" }).click();
  await expect(page.getByPlaceholder("Buscar…")).toBeVisible();
  await page.getByRole("tab", { name: "Camadas" }).click();
  await expect(page.getByTestId("layers-panel")).toBeVisible();
  await page.getByRole("tab", { name: "Páginas" }).click();
  await expect(page.getByTestId("status-bar")).toBeVisible();
  const templateField = page.getByLabel("Template");
  await expect(templateField.locator("option")).toHaveCount(12);
  await expect(templateField.locator("option", { hasText: /branco/i })).toHaveCount(0);

  const narrativeAdd = page.getByRole("button", { name: "Adicionar página depois", exact: true });
  await narrativeAdd.last().click();
  const narrativeThumbnail = page.locator("button .k-page[data-template='narrative']").last();
  await narrativeThumbnail.locator("xpath=ancestor::button[1]").click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("clear-page").click();

  const canvas = page.getByTestId("editor-canvas");
  const editorPage = page.locator(".k-editor-page").first();
  const pageBox = await editorPage.boundingBox();
  expect(pageBox).not.toBeNull();
  const box = pageBox!;

  await page.getByTestId("frame-tool").click();
  await page.mouse.move(box.x + 45, box.y + 45);
  await page.mouse.down();
  await page.mouse.move(box.x + 185, box.y + 150);
  await page.mouse.up();
  await page.getByRole("button", { name: "TEXTO", exact: true }).click();
  await page.getByLabel("Editar texto diretamente na página").fill("KALLISTIS");
  await page.getByLabel("Tamanho da fonte").fill("18pt");
  await expect(editorPage.locator(".k-block--text")).toContainText("KALLISTIS");

  const textSurface = editorPage.getByTestId("block-drag-surface");
  const textSurfaceBox = await textSurface.boundingBox();
  expect(textSurfaceBox).not.toBeNull();
  await page.mouse.move(textSurfaceBox!.x + 20, textSurfaceBox!.y + 20);
  await page.mouse.down();
  await page.mouse.move(textSurfaceBox!.x + 35, textSurfaceBox!.y + 30);
  await page.mouse.up();
  await expect(editorPage.getByTestId("block-resize-handle-nw")).toBeVisible();

  await page.getByTestId("frame-tool").click();
  await page.mouse.move(box.x + 210, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 335, box.y + 165);
  await page.mouse.up();
  await page.getByRole("button", { name: "IMAGEM", exact: true }).click();
  await expect(editorPage.locator(".k-block--image")).toHaveCount(1);
  await page.getByRole("tab", { name: "Assets" }).click();
  await page.locator("button[draggable='true']").first().click({ force: true });
  await expect(editorPage.locator(".k-block--image img, .k-image-placeholder")).toHaveCount(1);

  await editorPage.getByTestId("image-resize-handle-nw").click();
  await page.keyboard.press("Delete");
  await expect(editorPage.locator(".k-block--image")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const saved = JSON.parse(localStorage.getItem(key) ?? "null");
        const candidate = saved?.pages?.find((item: { blocks?: Array<{ content?: string }> }) =>
          item.blocks?.some((block) => block.content === "KALLISTIS"),
        );
        return candidate?.blocks?.length ?? null;
      }, storageKey),
    )
    .toBe(1);

  const beforeZoom = await page.getByText(/%$/, { exact: false }).last().textContent();
  await canvas.hover();
  await page.mouse.wheel(0, -260);
  await expect(page.getByText(/%$/, { exact: false }).last()).not.toHaveText(beforeZoom ?? "");

  await page.reload();
  const composedPageId = await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    return saved.pages.find((candidate: { blocks?: Array<{ content?: string }> }) =>
      candidate.blocks?.some((block) => block.content === "KALLISTIS"),
    )?.id;
  }, storageKey);
  const reloadedNarrativeThumbnail = page.locator(
    `button .k-page[data-page-id="${composedPageId}"]`,
  );
  await reloadedNarrativeThumbnail.locator("xpath=ancestor::button[1]").click();
  const reloadedBlank = page.locator(`.k-editor-page[data-page-id="${composedPageId}"]`);
  await expect(
    reloadedBlank.locator(".k-block--text").filter({ hasText: "KALLISTIS" }),
  ).toHaveCount(1);
  await expect(reloadedBlank.locator(".k-block--image")).toHaveCount(0);

  await page.goto("/print");
  await expect(page.locator("html")).toHaveAttribute("data-print-ready", "true");
  await expect(
    page.locator(".k-page .k-block--text").filter({ hasText: "KALLISTIS" }).first(),
  ).toBeVisible();

  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    storageKey,
  );
  expect(
    saved.pages.some((candidate: { blocks?: Array<{ content?: string }> }) =>
      candidate.blocks?.some((block) => block.content === "KALLISTIS"),
    ),
  ).toBe(true);
});
