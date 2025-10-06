import React from 'react';
import { cn } from '@/lib/utils';
import { MemberAvatar } from '@/components/avatar/MemberAvatar';

export type LeaderboardMember = {
  id: string;
  name: string;
  points: number;
  avatarUrl?: string | null;
  updatedAt: string; // ISO8601
};

export type LeaderboardSettings = {
  mode?: 'family' | 'classroom';
  reducedMotion?: boolean;
};

type Props = {
  members: LeaderboardMember[];
  settings?: LeaderboardSettings;
  className?: string;
  onMemberSelect?: (member: LeaderboardMember) => void;
};

type RankBuckets = {
  top3: LeaderboardMember[];
  rest: LeaderboardMember[];
};

const sortMembers = (members: LeaderboardMember[]): LeaderboardMember[] => {
  return members
    .slice()
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const at = new Date(a.updatedAt).getTime();
      const bt = new Date(b.updatedAt).getTime();
      if (bt !== at) return bt - at;
      return a.name.localeCompare(b.name);
    });
};

const computeRanks = (members: LeaderboardMember[]): RankBuckets => {
  const sorted = sortMembers(members);
  return {
    top3: sorted.slice(0, 3),
    rest: sorted.slice(3),
  };
};

// FLIP helpers
type BoxMap = Map<string, DOMRect>;

const captureRects = (nodes: HTMLElement[]): BoxMap => {
  const map: BoxMap = new Map();
  nodes.forEach((n) => {
    const id = n.dataset.key;
    if (!id) return;
    map.set(id, n.getBoundingClientRect());
  });
  return map;
};

const playFLIP = (
  first: BoxMap,
  last: BoxMap,
  opts: { duration: number; easing: string; reduced: boolean }
) => {
  last.forEach((lastRect, key) => {
    const firstRect = first.get(key);
    if (!firstRect) return;
    const dx = firstRect.left - lastRect.left;
    const dy = firstRect.top - lastRect.top;
    const node = document.querySelector<HTMLElement>(`[data-key="${key}"]`);
    if (!node) return;
    node.style.willChange = 'transform, opacity';
    node.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' },
      ],
      {
        duration: opts.reduced ? Math.min(180, opts.duration) : opts.duration,
        easing: opts.reduced ? 'linear' : opts.easing,
      }
    ).finished.finally(() => {
      node.style.willChange = '';
    });
  });
};

export const TouchLeaderboardPodiumView: React.FC<Props> = ({
  members,
  settings,
  className,
  onMemberSelect,
}) => {
  const reduced = settings?.reducedMotion === true ||
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const podiumRef = React.useRef<HTMLDivElement | null>(null);
  const stripRef = React.useRef<HTMLDivElement | null>(null);
  const liveRef = React.useRef<HTMLDivElement | null>(null);

  const [buckets, setBuckets] = React.useState<RankBuckets>(() => computeRanks(members));
  const prevLeaderId = React.useRef<string | null>(null);
  const rafId = React.useRef<number | null>(null);
  const scheduleTimer = React.useRef<number | null>(null);

  // Debounce scoreboard churn per spec (default 700ms)
  React.useEffect(() => {
    const ms = 700;
    if (scheduleTimer.current) window.clearTimeout(scheduleTimer.current);
    scheduleTimer.current = window.setTimeout(() => {
      const next = computeRanks(members);
      // FLIP: measure first
      const nodes = [
        ...(podiumRef.current?.querySelectorAll<HTMLElement>('[data-key]') || []),
        ...(stripRef.current?.querySelectorAll<HTMLElement>('[data-key]') || []),
      ];
      const first = captureRects(Array.from(nodes));
      setBuckets(next);
      // Wait next frame to measure last and animate
      rafId.current = requestAnimationFrame(() => {
        const nodesLast = [
          ...(podiumRef.current?.querySelectorAll<HTMLElement>('[data-key]') || []),
          ...(stripRef.current?.querySelectorAll<HTMLElement>('[data-key]') || []),
        ];
        const last = captureRects(Array.from(nodesLast));
        playFLIP(first, last, {
          duration: 280,
          easing: 'cubic-bezier(.2,.8,.2,1)',
          reduced,
        });
      });

      // Announce ranks
      const leader = next.top3[0];
      if (leader && liveRef.current) {
        // announce first place
        liveRef.current.textContent = `First place: ${leader.name}, ${leader.points} points.`;
        if (leader.id !== prevLeaderId.current && !reduced) {
          // Optional: soft glow handled via CSS class on center step
          prevLeaderId.current = leader.id;
        }
      }
    }, ms);
    return () => {
      if (scheduleTimer.current) window.clearTimeout(scheduleTimer.current);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [members, reduced]);

  const handleSelect = (m: LeaderboardMember) => {
    onMemberSelect?.(m);
  };

  const top = buckets.top3;
  const rest = buckets.rest;

  return (
    <div ref={containerRef} className={cn('w-full h-full flex flex-col gap-4 select-none', className)}>
      {/* Live region for SR */}
      <div ref={liveRef} aria-live="polite" className="sr-only" />

      {/* Podium */}
      <div ref={podiumRef} className="w-full flex items-end justify-center gap-6">
        {/* 2nd */}
        <PodiumStep
          rank={2}
          color="#C0C0C0"
          heightClass="h-40"
          member={top[1]}
          onSelect={handleSelect}
          reducedMotion={reduced}
        />
        {/* 1st */}
        <PodiumStep
          rank={1}
          color="#FFD700"
          heightClass="h-52"
          member={top[0]}
          onSelect={handleSelect}
          reducedMotion={reduced}
          glow
        />
        {/* 3rd */}
        <PodiumStep
          rank={3}
          color="#CD7F32"
          heightClass="h-32"
          member={top[2]}
          onSelect={handleSelect}
          reducedMotion={reduced}
        />
      </div>

      {/* Leaderboard strip */}
      {/* <div
        ref={stripRef}
        className="w-full overflow-x-auto no-scrollbar">
        <div className="flex gap-4 py-2 px-2">
          {rest.map((m, i) => (
            <button
              key={m.id}
              data-key={`strip-${m.id}`}
              onClick={() => handleSelect(m)}
              className="flex flex-col items-center justify-center min-w-[100px]"
              aria-label={`Rank ${i + 4}, ${m.name}, ${m.points} points`}
            >
              <div className="relative w-[96px] h-[96px] rounded-full bg-white shadow flex items-center justify-center overflow-hidden">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatarUrl} alt="" className="w-[90px] h-[90px] rounded-full object-cover" />
                ) : (
                  <MemberAvatar memberId={m.id} viewMode="headshot" className="w-[90px] h-[90px]" />
                )}
                <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold rounded-full px-2 py-1">
                  #{i + 4}
                </span>
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm font-semibold truncate max-w-[100px]">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.points} pts</div>
              </div>
            </button>
          ))}
        </div>
      </div> */}
    </div>
  );
};

const PodiumStep: React.FC<{
  rank: 1 | 2 | 3;
  color: string;
  heightClass: string;
  member?: LeaderboardMember;
  glow?: boolean;
  reducedMotion?: boolean;
  onSelect: (m: LeaderboardMember) => void;
}> = ({ rank, color, heightClass, member, glow, reducedMotion, onSelect }) => {
  const key = member ? `podium-${member.id}` : `podium-empty-${rank}`;
  const scale = rank === 1 ? 1 : 0.94;
  return (
    <div className={cn('relative flex flex-col items-center justify-end', 'w-40')} data-key={key}>
      {/* Avatar area */}
      <button
        disabled={!member}
        onClick={() => member && onSelect(member)}
        className={cn(
          'relative z-10',
          'min-h-[140px] flex items-end justify-center',
          'touch-manipulation',
        )}
        aria-label={member ? `${rank === 1 ? 'First' : rank === 2 ? 'Second' : 'Third'} place: ${member.name}, ${member.points} points` : undefined}
      >
        <div
          className={cn(
            'origin-bottom will-change-transform',
            reducedMotion ? '' : 'transition-transform duration-150',
          )}
          style={{ transform: `scale(${scale})` }}
        >
          {member?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatarUrl} alt="" className="h-[140px] object-contain drop-shadow" />
          ) : member ? (
            <MemberAvatar memberId={member.id} viewMode="full" className="w-[120px] h-[140px]" headTopPercentOverride="2%" />
          ) : (
            <div className="h-[140px] w-[100px] bg-gray-200" />
          )}
        </div>
      </button>

      {/* Podium block */}
      <div
        className={cn(
          'relative w-full rounded-md bg-white shadow',
          heightClass,
          glow && 'data-[glow=true]:ring-4 data-[glow=true]:ring-yellow-300',
          'flex flex-col items-center justify-center mt-12 z-30'
        )}
        style={{
          boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
        }}
        data-glow={glow ? 'true' : undefined}
      >
        {/* Rank bar color */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-black" style={{ backgroundColor: color }}>
          #{rank}
        </div>
        <div className="text-center px-2">
          <div className="text-sm font-semibold truncate max-w-[9rem]">{member?.name || '—'}</div>
          <div className="font-extrabold text-lg">{member ? `${member.points} pts` : ''}</div>
        </div>
      </div>
    </div>
  );
};

export default TouchLeaderboardPodiumView;


