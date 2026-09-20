import { promises as fs } from 'node:fs';
import path from 'node:path';

const sourceDir = path.join(process.cwd(), 'public', 'menu-webp');
const targetDir = path.join(process.cwd(), 'public', 'menu-media');

await fs.mkdir(targetDir, { recursive: true });

const entries = await fs.readdir(sourceDir, { withFileTypes: true });
let written = 0;

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith('.txt')) continue;

  const inputPath = path.join(sourceDir, entry.name);
  const raw = (await fs.readFile(inputPath, 'utf8')).trim();
  const match = raw.match(/^data:image\/webp;base64,(.+)$/s);

  if (!match) {
    console.warn(`[menu-assets] Ignorado: ${entry.name} não contém WebP em data URI.`);
    continue;
  }

  const outputName = entry.name.replace(/\.txt$/i, '.webp');
  const outputPath = path.join(targetDir, outputName);
  await fs.writeFile(outputPath, Buffer.from(match[1], 'base64'));
  written += 1;
}

console.log(`[menu-assets] ${written} imagens WebP preparadas em public/menu-media.`);
