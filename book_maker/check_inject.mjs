import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const book = JSON.parse(await readFile("projects/kallistis-livro-basico.json", "utf8"));
console.log("Book pages:", book.pages.length);

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1240, height: 1754 } });
  await ctx.addInitScript((p) => {
    window.__KALLISTIS_BOOK__ = p;
  }, book);
  const page = await ctx.newPage();
  page.on("console", (m) => console.log("BROWSER:", m.type(), m.text()));
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  await page.goto("http://127.0.0.1:8080/print", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("html[data-print-ready='true']", { timeout: 60000 });
  const count = await page.locator(".k-page").count();
  console.log("k-page count:", count);
  const ids = await page.locator(".k-page").evaluateAll((els) => els.map((e) => e.dataset.pageId));
  console.log("first 5 page ids:", ids.slice(0, 5));
  console.log("last 5 page ids:", ids.slice(-5));
  const injected = await page.evaluate(() => Boolean(window.__KALLISTIS_BOOK__));
  console.log("__KALLISTIS_BOOK__ in page:", injected);
  const bookPages = await page.evaluate(() => window.__KALLISTIS_BOOK__?.pages?.length);
  console.log("__KALLISTIS_BOOK__.pages.length:", bookPages);
} finally {
  await browser.close();
}
