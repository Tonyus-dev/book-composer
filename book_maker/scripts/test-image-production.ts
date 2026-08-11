import { strict as assert } from "node:assert";
import { findPrimaryImage } from "../src/book/templates/types";
import { effectivePpiForSize, pixelsForPrint, printRasterPlan } from "../src/lib/assets/registry";
import type { ImageBlock } from "../src/book/types";

assert.equal(pixelsForPrint(25.4), 300);
assert.equal(pixelsForPrint(210), 2481);
assert.equal(effectivePpiForSize(2481, 3508, 210, 297), 300);
assert.equal(effectivePpiForSize(1240, 3508, 210, 297), 150);
assert.deepEqual(printRasterPlan(1200, 1800, 140, 210), {
  width: 1654,
  height: 2481,
  scale: 1.3783333333333334,
  interpolated: true,
  safe: true,
});
assert.equal(printRasterPlan(100, 10_000, 210, 297).safe, false);

const legacy: ImageBlock = { id: "legacy", type: "image", src: "/legacy.jpg", alt: "Legacy" };
const cover: ImageBlock = {
  id: "cover",
  type: "image",
  src: "/cover.jpg",
  alt: "Cover",
  position: "full",
  fullBleed: true,
};
assert.equal(findPrimaryImage([legacy, cover])?.id, "cover");
assert.equal(findPrimaryImage([legacy])?.id, "legacy");

console.log("image production: ok");
