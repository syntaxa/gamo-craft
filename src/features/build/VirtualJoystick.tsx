import { useEffect, useRef, useState } from 'react';
import { touchInput, type TouchMovementState } from './touchInput';

const MAX_TRAVEL = 44;
const DEAD_ZONE = 0.22;
const EMPTY_MOVEMENT: TouchMovementState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false,
};

type VirtualJoystickProps = {
  onJump: () => void;
  onToggleFly: () => void;
  onToggleInventory: () => void;
  isFlying: boolean;
};

export function VirtualJoystick({ onJump, onToggleFly, onToggleInventory, isFlying }: VirtualJoystickProps) {
  const [showOnScreen, setShowOnScreen] = useState(false);
  const padRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const baseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const sync = () => setShowOnScreen(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    return () => {
      touchInput.movement = { ...EMPTY_MOVEMENT };
    };
  }, []);

  if (!showOnScreen) return null;

  const setKnob = (x: number, y: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  };

  const applyVector = (dx: number, dy: number) => {
    const length = Math.hypot(dx, dy);
    const clamped = Math.min(length, MAX_TRAVEL);
    const ux = length > 0 ? (dx / length) * clamped : 0;
    const uy = length > 0 ? (dy / length) * clamped : 0;
    setKnob(ux, uy);

    const nx = ux / MAX_TRAVEL;
    const ny = uy / MAX_TRAVEL;
    const movement = touchInput.movement;
    movement.forward = -ny > DEAD_ZONE;
    movement.backward = ny > DEAD_ZONE;
    movement.left = -nx > DEAD_ZONE;
    movement.right = nx > DEAD_ZONE;
  };

  const resetJoystick = () => {
    activePointerIdRef.current = null;
    setKnob(0, 0);
    touchInput.movement.forward = false;
    touchInput.movement.backward = false;
    touchInput.movement.left = false;
    touchInput.movement.right = false;
  };

  const holdKey = (key: 'up' | 'down') => (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    touchInput.movement[key] = true;
  };

  const releaseKey = (key: 'up' | 'down') => () => {
    touchInput.movement[key] = false;
  };

  return (
    <>
      <div
        ref={padRef}
        className="touch-joystick"
        aria-label="Управление движением"
        role="application"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (activePointerIdRef.current !== null) return;
          activePointerIdRef.current = event.pointerId;
          const rect = padRef.current?.getBoundingClientRect();
          const cx = (rect?.left ?? 0) + (rect?.width ?? 0) / 2;
          const cy = (rect?.top ?? 0) + (rect?.height ?? 0) / 2;
          baseRef.current = { x: cx, y: cy };
          event.currentTarget.setPointerCapture(event.pointerId);
          applyVector(event.clientX - cx, event.clientY - cy);
        }}
        onPointerMove={(event) => {
          if (activePointerIdRef.current !== event.pointerId) return;
          event.preventDefault();
          applyVector(event.clientX - baseRef.current.x, event.clientY - baseRef.current.y);
        }}
        onPointerUp={(event) => {
          if (activePointerIdRef.current !== event.pointerId) return;
          resetJoystick();
        }}
        onPointerCancel={() => {
          resetJoystick();
        }}
      >
        <div ref={knobRef} className="touch-joystick-knob" aria-hidden />
      </div>

      <div className="touch-actions" aria-label="Кнопки управления">
        {isFlying ? (
          <div className="touch-action-row">
            <button
              type="button"
              className="touch-action-btn"
              aria-label="Вверх"
              onPointerDown={holdKey('up')}
              onPointerUp={releaseKey('up')}
              onPointerCancel={releaseKey('up')}
            >
              ▲
            </button>
            <button
              type="button"
              className="touch-action-btn"
              aria-label="Вниз"
              onPointerDown={holdKey('down')}
              onPointerUp={releaseKey('down')}
              onPointerCancel={releaseKey('down')}
            >
              ▼
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="touch-action-btn touch-action-btn-jump"
          aria-label="Прыжок"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onJump();
          }}
        >
          ↑
        </button>

        <button
          type="button"
          className={`touch-action-btn ${isFlying ? 'is-active' : ''}`}
          aria-label="Переключить полет"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleFly();
          }}
        >
          {isFlying ? 'Полет: вкл' : 'Полет'}
        </button>

        <button
          type="button"
          className="touch-action-btn"
          aria-label="Полный инвентарь"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleInventory();
          }}
        >
          Инвентарь
        </button>
      </div>
    </>
  );
}