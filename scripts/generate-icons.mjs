import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, '..');

const SOURCE_SVG = join(rootDir, 'public', 'resource-packs', 'cartoon-blocky-v1', 'ui', 'coin_icon_kotocoin.svg');
const OUT_DIR = join(rootDir, 'public', 'icons');
const MASKABLE_BG = '#eaf6ff';

async function main() {
  const source = await readFile(SOURCE_SVG, 'utf8');
  const contentMatch = source.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!contentMatch) {
    throw new Error('Не удалось извлечь содержимое SVG: ' + SOURCE_SVG);
  }
  const body = contentMatch[1];

  await mkdir(OUT_DIR, { recursive: true });

  async function renderSvg(svg, outName, size) {
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: size },
      background: 'rgba(0, 0, 0, 0)',
    });
    const png = resvg.render().asPng();
    await writeFile(join(OUT_DIR, outName), png);
    console.log(`OK ${outName} (${size}x${size}, ${(png.length / 1024).toFixed(1)} KB)`);
  }

  function composeWithBackground(size, contentFraction) {
    const inner = 128 * contentFraction;
    const pad = Math.round((size - inner) / 2);
    const scale = inner / 128;
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
      `<rect width="${size}" height="${size}" fill="${MASKABLE_BG}"/>`,
      `<g transform="translate(${pad}, ${pad}) scale(${scale.toFixed(4)})">`,
      body,
      `</g>`,
      `</svg>`,
    ].join('');
  }

  // Обычные иконки: совпадают с игровым изображением (полупрозрачные углы, как у монеты).
  await renderSvg(source, 'icon-192.png', 192);
  await renderSvg(source, 'icon-512.png', 512);

  // Maskable: монета внутри безопасной зоны на сплошном фоне (Android маскирует края).
  await renderSvg(composeWithBackground(512, 0.74), 'icon-maskable-512.png', 512);

  // Apple touch icon: непрозрачная иконка.
  await renderSvg(composeWithBackground(180, 0.85), 'apple-touch-icon-180.png', 180);

  console.log('Готово: ' + OUT_DIR);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});