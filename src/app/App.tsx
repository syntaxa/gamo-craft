import { NavLink } from 'react-router-dom';
import { AppRouter } from './router';
import { CurrencyBadge } from '../shared/ui/CurrencyBadge';
import { useAppStore } from './store';

export function App() {
  const catCoins = useAppStore((s) => s.player.currencyCatCoins);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">Gamo</div>
          <div className="app-version">v{__APP_VERSION__}</div>
        </div>
        <CurrencyBadge value={catCoins} />
      </header>

      <nav className="main-nav" aria-label="Main">
        <NavLink to="/" end>Мир</NavLink>
        <NavLink to="/lesson">Учеба</NavLink>
        <NavLink to="/shop">Магазин</NavLink>
        <NavLink to="/eggs">Яйца</NavLink>
        <NavLink to="/profile">Профиль</NavLink>
      </nav>

      <main className="screen-wrap">
        <AppRouter />
      </main>
    </div>
  );
}
