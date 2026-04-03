import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { useAppStore } from '../../app/store';

const BASIC_PACK_COST = 15;

export function ShopScreen() {
  const spend = useAppStore((s) => s.spendCatCoins);
  const addInventoryItem = useAppStore((s) => s.addInventoryItem);

  function buyBasic() {
    if (!spend(BASIC_PACK_COST)) return;
    addInventoryItem('res_wood', 10);
    addInventoryItem('block_brick_red', 10);
  }

  return (
    <Card>
      <h2>Магазин ресурсов</h2>
      <p>Базовый набор: дерево + кирпич.</p>
      <Button onClick={buyBasic}>Купить за {BASIC_PACK_COST} кото-монеток</Button>
    </Card>
  );
}
