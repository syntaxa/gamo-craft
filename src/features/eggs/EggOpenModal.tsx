import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useResourcePack } from '../../theme/useResourcePack';
import {
  EGG_LAND_HIGHLIGHT_MS,
  EGG_REWARD_FADE_MS,
  EGG_REWARD_SHOW_MS,
  EGG_SPIN_DURATION_MS,
  resolveReelTransforms,
} from './reel';
import type { ReelTransforms } from './reel';
import type { EggReward } from './types';
import { rewardTextureFor } from './types';
import { EggRewardCard } from './EggRewardCard';

type EggOpenPhase = 'spin' | 'landed' | 'reward' | 'closing';

interface EggOpenModalProps {
  pool: EggReward[];
  reward: EggReward;
  onComplete: () => void;
}

export function EggOpenModal({ pool, reward, onComplete }: EggOpenModalProps) {
  const resourcePack = useResourcePack();
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const [transforms, setTransforms] = useState<ReelTransforms<EggReward> | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<EggOpenPhase>('spin');
  const timeoutIds = useRef<number[]>([]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const pointer = pointerRef.current;
    if (!viewport || !pointer) {
      return;
    }
    const viewportRect = viewport.getBoundingClientRect();
    const pointerRect = pointer.getBoundingClientRect();
    const borderLeft = parseFloat(getComputedStyle(viewport).borderLeftWidth) || 0;
    const pointerX = pointerRect.left + pointerRect.width / 2 - viewportRect.left - borderLeft;
    setTransforms(resolveReelTransforms(pool, reward, pointerX));
  }, [pool, reward]);

  useEffect(() => {
    timeoutIds.current = [
      window.setTimeout(() => {
        timeoutIds.current.push(
          window.setTimeout(() => {
            setReady(true);
          }, 0),
        );
      }, 0),
    ];

    return () => {
      timeoutIds.current.forEach((id) => window.clearTimeout(id));
      timeoutIds.current = [];
    };
  }, []);

  useEffect(() => {
    let timerId = 0;
    if (phase === 'spin') {
      timerId = window.setTimeout(() => setPhase('landed'), EGG_SPIN_DURATION_MS);
    } else if (phase === 'landed') {
      timerId = window.setTimeout(() => setPhase('reward'), EGG_LAND_HIGHLIGHT_MS);
    } else if (phase === 'reward') {
      timerId = window.setTimeout(() => setPhase('closing'), EGG_REWARD_SHOW_MS);
    } else if (phase === 'closing') {
      timerId = window.setTimeout(onComplete, EGG_REWARD_FADE_MS);
    }
    return () => window.clearTimeout(timerId);
  }, [phase, onComplete]);

  const rewardTexture = rewardTextureFor(reward, resourcePack);
  const showRibbon = phase === 'spin' || phase === 'landed';
  const isClosing = phase === 'closing';

  return (
    <div className="egg-open-modal" role="dialog" aria-modal="true" aria-label="Открытие яйца">
      <div className="egg-spin-window">
        <div className="egg-spin-pointer" ref={pointerRef} aria-hidden="true" />
        {showRibbon ? (
          <div className="egg-spin-viewport" ref={viewportRef}>
            {transforms && (
              <div
                className={
                  phase === 'landed' ? 'egg-spin-track egg-spin-track-landed' : 'egg-spin-track'
                }
                style={{
                  transform: `translateX(${ready ? transforms.finalOffset : transforms.startOffset}px)`,
                  transition: `transform ${EGG_SPIN_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
                }}
              >
                {transforms.items.map((item, index) => (
                  <div
                    key={index}
                    className={
                      index === transforms.stopIndex && phase === 'landed'
                        ? 'egg-spin-cell egg-spin-cell-winner'
                        : 'egg-spin-cell'
                    }
                  >
                    <div className="egg-spin-cell-icon">
                      {item.kind === 'poster' ? (
                        <img className="egg-spin-cell-poster" src={item.imageUrl} alt="" loading="eager" />
                      ) : (
                        <span
                          className="egg-spin-cell-block"
                          style={{ backgroundImage: `url("${rewardTextureFor(item, resourcePack)}")` }}
                        />
                      )}
                    </div>
                    <div className="egg-spin-cell-label">{item.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={`egg-spin-reward ${isClosing ? 'egg-reward-fading' : ''}`}>
            <EggRewardCard reward={reward} texture={rewardTexture} />
            <p className="egg-spin-reward-note">Награда получена и доступна в режиме строительства.</p>
          </div>
        )}
      </div>
    </div>
  );
}