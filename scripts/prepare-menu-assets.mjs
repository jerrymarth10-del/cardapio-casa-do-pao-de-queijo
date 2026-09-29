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


const PROFESSIONAL_ASSETS = {
  'pro-pao.png': 'https://d2jqrm6oza8nb6.cloudfront.net/datasets/696b1d7b-3f2e-4b70-b000-dcaceb486c1a.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNmQzNTE5MWM2ODM3MDFlMCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDgxMDc4MH0.pE8qm0ypIZ2pAn0mo6oFcYypeBL2HmWNyta1bhquKCE',
  'pro-salgados.png': 'https://d2jqrm6oza8nb6.cloudfront.net/datasets/cf96b788-e326-4d13-829c-e2827b4f116c.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMmJkMDgzMTE1YWY2YzFkMiIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDgwNjkyOX0.cUcFlO_RLeGDhv98ztvQcT_Joi0zVf1-z6TYPnN_K_E',
  'pro-cafe.png': 'https://d2jqrm6oza8nb6.cloudfront.net/datasets/a84ebe92-f4d8-4c84-b973-392970c6bffb.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMzUyY2JmOWMxNTI3YTVkNSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDg1Nzg4NH0.gqsZP8N2dPEwlyL28RQU6xuotM8_gq68XREliHRyGd4',
  'pro-bebidas.png': 'https://d2jqrm6oza8nb6.cloudfront.net/datasets/d0cf0662-a050-4ac6-8434-d6c3923a01b4.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOWJkOGE0NTU4Y2NlMjVkZCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDg0MjMyNX0.yzTfq2uQeKF7BwUjyFdJGn8Xs7N5RjBK5f4yxHYj-sw'
};

for (const [filename, url] of Object.entries(PROFESSIONAL_ASSETS)) {
  const outputPath = path.join(targetDir, filename);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, bytes);
    console.log(`[menu-assets] Imagem profissional preparada: ${filename} (${bytes.length} bytes)`);
  } catch (error) {
    console.error(`[menu-assets] Falha ao baixar ${filename}:`, error);
    throw error;
  }
}
