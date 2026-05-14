import { useEffect, useState } from 'react';

export function VirtualJoystick({ onJump }: { onJump: () => void }) {
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
    >
      <button
        type="button"
        aria-label="Прыжок"
        onPointerDown={(event) => {
          event.preventDefault();
          onJump();
        }}
        style={{
          position: 'absolute',
          left: 136,
          bottom: 18,
          width: 64,
          height: 64,
          borderRadius: 999,
          border: '1px solid rgba(28, 69, 114, 0.45)',
          background: 'rgba(255,255,255,0.55)',
          color: '#17395f',
          fontWeight: 800,
        }}
      >
        ↑
      </button>
    </div>
  );
}
