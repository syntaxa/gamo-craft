import { useEffect, useState } from 'react';

export function VirtualJoystick() {
  const [showOnScreen, setShowOnScreen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const sync = () => setShowOnScreen(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  if (!showOnScreen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        width: 120,
        height: 120,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.35)',
        border: '1px solid #aac6e6',
      }}
    />
  );
}
