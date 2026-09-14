import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import lootTables from '../../content/catalogs/lootTables.v1.json';
import posterItems from '../../content/catalogs/items.posters.v1.json';
import resources from '../../content/catalogs/items.resources.v1.json';
import shop from '../../content/catalogs/shop.v1.json';

describe('catalog invariants', () => {
  const resourceById = new Map(resources.items.map((item) => [item.id, item]));
  const posterById = new Map(posterItems.items.map((item) => [item.id, item]));

  it('keeps every egg reward usable as an FPV build block or poster item', () => {
    for (const table of lootTables.tables) {
      for (const entry of table.entries) {
        const resource = resourceById.get(entry.itemId);
        const poster = posterById.get(entry.itemId);
        expect(resource?.kind === 'block' || poster?.kind === 'poster').toBe(true);
        expect(entry.weight).toBeGreaterThan(0);
      }
    }
  });

  it('defines the glass block shop lot and resource-pack asset', () => {
    expect(resourceById.get('block_glass')).toMatchObject({
      id: 'block_glass',
      kind: 'block',
      icon: 'block_glass.svg',
    });

    expect(shop.items.find((item) => item.id === 'lot_glass_10')).toMatchObject({
      priceCatCoins: 50,
      payload: { block_glass: 10 },
    });

    expect(
      existsSync(join(process.cwd(), 'public/resource-packs/cartoon-blocky-v1/world/block_glass.svg')),
    ).toBe(true);
  });

  it('defines meme poster items with local assets and 2x2 placement metadata', () => {
    expect(posterItems.items.length).toBeGreaterThan(0);

    for (const poster of posterItems.items) {
      expect(poster).toMatchObject({
        kind: 'poster',
        widthBlocks: 2,
        heightBlocks: 2,
      });
      expect(poster.image).toMatch(/^\.\/assets\//);
      expect(existsSync(join(process.cwd(), 'public', poster.image.slice(2)))).toBe(true);
    }

    expect(lootTables.tables.find((table) => table.id === 'loot_meme_posters')?.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: posterItems.items[0].id }),
      ]),
    );
  });

  it('uses normalized transparent poster image assets', () => {
    for (const poster of posterItems.items) {
      expect(poster.image).toMatch(/^\.\/assets\/posters\/transparent\//);
    }
  });
});
