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

const REQUIRED_ASSETS = [
  'logo.webp','fachada.webp','tradicional.webp','tradicional2.webp','catupiry.webp','calabresa.webp','frango.webp',
  'doceDeLeite.webp','goiabada.webp','chocolate.webp','toddynho.webp','tampico.webp','pastel-vento.webp',
  'cafe-novo.webp','cafe-com-leite-novo.webp','salgado-frango-catupiry.webp','salgado-carne-novo.webp',
  'salgado-queijo-presunto-novo.webp','salgado-mini-pizza.webp','refri-coca.webp','refri-fanta.webp',
  'refri-guarana.webp','refri-pepsi.webp','refri-pepsi-limao.webp','gatorade-vermelho.webp',
  'gatorade-amarelo.webp','gatorade-laranja.webp','gatorade-azul.webp','red-bull.webp','cafe-agua-dourada.webp'
];

for (const filename of REQUIRED_ASSETS) {
  await fs.access(path.join(targetDir, filename));
}

console.log(`[menu-assets] Validação concluída: ${REQUIRED_ASSETS.length} assets locais prontos.`);
