import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import lootTables from '../../content/catalogs/lootTables.v1.json';
import resources from '../../content/catalogs/items.resources.v1.json';
import shop from '../../content/catalogs/shop.v1.json';

describe('catalog invariants', () => {
  const resourceById = new Map(resources.items.map((item) => [item.id, item]));

  it('keeps every egg reward usable as an FPV build block', () => {
    for (const table of lootTables.tables) {
      for (const entry of table.entries) {
        expect(resourceById.get(entry.itemId)?.kind).toBe('block');
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
});
