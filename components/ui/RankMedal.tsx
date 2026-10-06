import type { RankInfo } from '@/lib/ranks';

interface RankBadgeProps {
  rankInfo: RankInfo;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  leaderboardRank?: number | null;
  className?: string;
}

const sizeMap = {
  xs: 28,
  sm: 40,
  md: 58,
  lg: 84,
  xl: 120,
};

export function RankMedal({
  rankInfo,
  size = 'md',
  showLabel = false,
  leaderboardRank,
  className = '',
}: RankBadgeProps) {
  const px = sizeMap[size];

  const label =
    rankInfo.tier === 0
      ? 'Без ранга'
      : rankInfo.tier === 8
      ? leaderboardRank
        ? `Титан #${leaderboardRank}`
        : 'Титан'
      : `${rankInfo.name} ${rankInfo.stars > 0 ? `${rankInfo.stars}★` : ''}`;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* Official Valve Medal + Star Overlay */}
      <div
        className="relative inline-flex items-center justify-center shrink-0 drop-shadow-md select-none"
        style={{ width: px, height: px }}
      >
        {/* Base medal icon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rankInfo.medalIconPath}
          alt={label}
          width={px}
          height={px}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Star overlay (if 1-5 stars) */}
        {rankInfo.starIconPath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={rankInfo.starIconPath}
            alt=""
            width={px}
            height={px}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Immortal leaderboard rank badge */}
        {rankInfo.tier === 8 && leaderboardRank && (
          <div className="absolute -bottom-1 font-mono font-black text-[9px] text-amber-300 bg-black/90 px-1.5 py-0.2 rounded border border-amber-500/50 shadow">
            #{leaderboardRank}
          </div>
        )}
      </div>

      {/* Label below */}
      {showLabel && (
        <div className="text-center leading-tight">
          <div className={`font-bold text-xs ${rankInfo.textColor}`}>{label}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
            {rankInfo.nameEn}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact inline badge version
export function RankBadgeInline({
  rankInfo,
  leaderboardRank,
}: {
  rankInfo: RankInfo;
  leaderboardRank?: number | null;
}) {
  const label =
    rankInfo.tier === 0
      ? 'Без ранга'
      : rankInfo.tier === 8
      ? leaderboardRank
        ? `Титан #${leaderboardRank}`
        : 'Титан'
      : `${rankInfo.name} ${rankInfo.stars > 0 ? `${rankInfo.stars}★` : ''}`;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl border ${rankInfo.borderColor} ${rankInfo.bgColor} px-2.5 py-1 shadow-sm`}
    >
      <RankMedal rankInfo={rankInfo} size="xs" />
      <div>
        <div className={`font-bold text-xs ${rankInfo.textColor}`}>{label}</div>
        <div className="text-[9px] text-zinc-500 uppercase font-mono">{rankInfo.nameEn}</div>
      </div>
    </div>
  );
}
