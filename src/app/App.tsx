import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AppRouter } from './router';
import { CurrencyBadge } from '../shared/ui/CurrencyBadge';
import { useAppStore } from './store';
import { applyResourcePack } from '../theme/applyResourcePack';
import { useResourcePack } from '../theme/useResourcePack';

export function App() {
  const catCoins = useAppStore((s) => s.player.currencyCatCoins);
  const resourcePack = useResourcePack();

  useEffect(() => {
    applyResourcePack(resourcePack);
  }, [resourcePack]);

return (
    <div className="app-shell">
      <div className="main-nav-row">
        <nav className="main-nav" aria-label="Main">
          <NavLink to="/" end>Мир</NavLink>
          <NavLink to="/lesson">Учеба</NavLink>
          <NavLink to="/shop">Магазин</NavLink>
          <NavLink to="/eggs">Яйца</NavLink>
          <NavLink to="/profile">Профиль</NavLink>
        </nav>
        <CurrencyBadge value={catCoins} />
      </div>

      <main className="screen-wrap">
        <AppRouter />
      </main>
    </div>
  );
}

