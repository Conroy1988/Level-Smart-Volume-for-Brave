import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const iconSource = path.join(root, "assets/icons/icon.svg");
async function render(source, target, size) {
  await mkdir(path.dirname(target), { recursive: true });
  await sharp(source, { density: size >= 512 ? 192 : 384 })
    .resize(size, size, { fit: "fill" })
    .png()
    .toFile(target);
  await access(target);
}

for (const size of [16, 32, 48, 128, 512]) {
  await render(
    iconSource,
    path.join(root, `assets/icons/icon-${size}.png`),
    size
  );
}

const storeRenders = [
  ["promo-small.svg", "promo-small.png", 440, 280],
  ["promo-marquee.svg", "promo-marquee.png", 1400, 560],
  ["screenshot-01.svg", "screenshot-01.png", 1280, 800]
];
for (const [sourceName, targetName, width, height] of storeRenders) {
  const source = path.join(root, "assets/store", sourceName);
  const target = path.join(root, "assets/store", targetName);
  await sharp(source, { density: 144 })
    .resize(width, height, { fit: "fill" })
    .flatten({ background: "#0d0c13" })
    .removeAlpha()
    .png()
    .toFile(target);
}

console.log("Generated Level icons and store artwork.");
