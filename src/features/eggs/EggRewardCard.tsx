import type { EggReward } from './types';

interface EggRewardCardProps {
  reward: EggReward;
  texture: string;
}

export function EggRewardCard({ reward, texture }: EggRewardCardProps) {
  return (
    <article className="shop-lot">
      {reward.kind === 'poster' ? (
        <div className="egg-poster-preview" aria-hidden style={{ backgroundImage: `url("${texture}")` }} />
      ) : (
        <div className="shop-lot-iso" aria-hidden>
          <span className="shop-lot-shadow" />
          <span className="shop-cube-face shop-cube-top" style={{ backgroundImage: `url("${texture}")` }} />
          <span className="shop-cube-face shop-cube-left" style={{ backgroundImage: `url("${texture}")` }} />
          <span className="shop-cube-face shop-cube-right" style={{ backgroundImage: `url("${texture}")` }} />
        </div>
      )}
      <div className="shop-lot-title">{reward.label}</div>
      <div className="shop-lot-count">
        {reward.count} {reward.kind === 'poster' ? 'постер' : 'блоков'}
      </div>
    </article>
  );
}