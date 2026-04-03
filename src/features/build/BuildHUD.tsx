import { Card } from '../../shared/ui/Card';

export function BuildHUD({ isFlying }: { isFlying: boolean }) {
  return (
    <Card>
      <strong>Строительство (FPV)</strong>
      <p style={{ margin: '8px 0 0 0' }}>
        Desktop: WASD + мышь. Двойной Space переключает Creative-полет ({isFlying ? 'включен' : 'выключен'}).
      </p>
    </Card>
  );
}
