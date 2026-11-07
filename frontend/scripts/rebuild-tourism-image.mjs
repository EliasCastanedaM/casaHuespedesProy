import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Reconstituye el PNG original sin pérdida a partir de 11 segmentos binarios.
const frontendRoot = fileURLToPath(new URL("../", import.meta.url));
const dir = join(frontendRoot, "assets", "tourism-poster-parts");
const output = join(frontendRoot, "public", "img", "home", "descubre-pimentel-y-lambayeque.png");
const buffers = Array.from({ length: 11 }, (_, i) =>
  readFileSync(join(dir, "part-" + String(i).padStart(2, "0") + ".bin")),
);
const data = Buffer.concat(buffers);
const expectedHash = "f56f57e4890fcc1cbaa4d6e1de992dab8b625d7405e47d9d77b987244040a157";
const hash = createHash("sha256").update(data).digest("hex");
if (data.length !== 3161181 || hash !== expectedHash) {
  throw new Error("El afiche turístico no coincide con la imagen original.");
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, data);
console.info("Afiche turístico original reconstruido correctamente.");
