import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const BG = [11, 36, 28];
const ACCENT = [184, 255, 74];

const clamp = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (t) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

function render(size, { opaque = false, padding = 0 } = {}) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  const half = size / 2;
  const radius = size * 0.225;
  const inset = padding * size;
  const glyphMax = (size - inset * 2) / 2;
  const ringR = glyphMax * 0.52;
  const ringHalfW = Math.max(1, size * 0.022);
  const dotR = glyphMax * 0.16;

  const roundedRectDist = (px, py) => {
    const qx = Math.abs(px - cx) - (half - radius);
    const qy = Math.abs(py - cy) - (half - radius);
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const d = Math.hypot(px - cx, py - cy);
      const cover = opaque ? 1 : 1 - smoothstep(roundedRectDist(px, py) + 0.5);

      let [r, g, b] = BG;
      let a = 0;
      if (cover > 0) {
        const ringEdge = 0.5 - Math.abs(d - ringR) / ringHalfW;
        const ringCover = smoothstep(ringEdge + 0.5);
        const dotCover = 1 - smoothstep(d - dotR + 0.5);
        if (ringCover > dotCover) {
          [r, g, b, a] = [...ACCENT, Math.round(255 * cover * ringCover)];
        } else if (dotCover > 0) {
          [r, g, b, a] = [...ACCENT, Math.round(255 * cover * dotCover)];
        } else {
          a = Math.round(255 * cover);
        }
      }
      const idx = (size * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }
  return PNG.sync.write(png);
}

const files = {
  "icon-192.png": render(192),
  "icon-512.png": render(512),
};

for (const [name, buf] of Object.entries(files)) {
  fs.writeFileSync(path.join(outDir, name), buf);
}
