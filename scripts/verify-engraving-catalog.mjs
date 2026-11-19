import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(
  readFileSync(new URL('../src/rendering/engravingCatalog.json', import.meta.url), 'utf8'),
);
const engravings = new URL('../public/terrain/engravings/', import.meta.url);

for (const [id, { sha256 }] of Object.entries(catalog)) {
  const file = `${id}.png`;
  let bytes;
  try {
    bytes = readFileSync(new URL(file, engravings));
  } catch (error) {
    throw new Error(`Cannot read engraving ${file}: ${error.code ?? error.message}`, { cause: error });
  }

  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== sha256) {
    throw new Error(`Engraving ${file}: SHA-256 mismatch (expected ${sha256}, got ${actual})`);
  }
}

console.log(`Verified ${Object.keys(catalog).length} engraving PNGs against the catalog.`);
