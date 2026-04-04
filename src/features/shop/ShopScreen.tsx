import type { CSSProperties } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { useAppStore } from '../../app/store';
import { useResourcePack } from '../../theme/useResourcePack';

const LOT_SIZE = 20;

const SHOP_LOTS = [
  { itemId: 'res_planks', label: 'Доски', price: 10 },
  { itemId: 'block_brick_red', label: 'Кирпич', price: 30 },
] as const;

export function ShopScreen() {
  const spend = useAppStore((s) => s.spendCatCoins);
  const addInventoryItem = useAppStore((s) => s.addInventoryItem);
  const resourcePack = useResourcePack();

  function buyLot(itemId: string, price: number) {
    if (!spend(price)) return;
    addInventoryItem(itemId, LOT_SIZE);
  }

  return (
    <Card>
      <div className="shop-screen">
        <h2>Магазин ресурсов</h2>
        <div className="shop-showcase">
          {SHOP_LOTS.map((lot) => {
            const spec = resourcePack.world.blocks[lot.itemId] ?? resourcePack.world.defaultBlock;
            const topTexture = spec.faceTextures?.top ?? spec.textureUrl;
            const sideTexture = spec.faceTextures?.side ?? spec.textureUrl;
            const sideRotation = spec.faceTextureRotationDeg?.side ?? 0;
            const sideFillStyle: CSSProperties = {
              backgroundImage: `url("${sideTexture}")`,
              transform: sideRotation ? `rotate(${sideRotation}deg) scale(1.42)` : undefined,
            };

            return (
              <article key={lot.itemId} className="shop-lot">
                <div className="shop-lot-iso" aria-hidden>
                  <span className="shop-lot-shadow" />
                  <span className="shop-cube-face shop-cube-top">
                    <span className="shop-cube-face-fill" style={{ backgroundImage: `url("${topTexture}")` }} />
                  </span>
                  <span className="shop-cube-face shop-cube-left">
                    <span className="shop-cube-face-fill" style={sideFillStyle} />
                  </span>
                  <span className="shop-cube-face shop-cube-right">
                    <span className="shop-cube-face-fill" style={sideFillStyle} />
                  </span>
                </div>
                <div className="shop-lot-title">{lot.label}</div>
                <div className="shop-lot-count">{LOT_SIZE} блоков</div>
                <Button onClick={() => buyLot(lot.itemId, lot.price)}>
                  <span className="shop-price-tag">
                    <span>{lot.price}</span>
                    <span className="shop-price-coin" aria-hidden />
                  </span>
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
