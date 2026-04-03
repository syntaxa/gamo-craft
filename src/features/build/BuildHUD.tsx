import { Card } from '../../shared/ui/Card';

export function BuildHUD({ isFlying, packName }: { isFlying: boolean; packName: string }) {
  return (
    <Card>
      <strong>Строительство (FPV)</strong>
      <p style={{ margin: '8px 0 0 0' }}>
        Desktop: WASD + удержание ПКМ для свободного обзора. Двойной Space переключает Creative-полет ({isFlying ? 'включен' : 'выключен'}).
      </p>
      <p style={{ margin: '6px 0 0 0' }}>Активный ресурс-пак: {packName}</p>
    </Card>
  );
}

