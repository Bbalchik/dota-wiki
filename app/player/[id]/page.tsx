import {
  fetchPlayerProfile,
  fetchPlayerWinLoss,
  fetchRecentMatches,
  fetchAllPlayerMatches,
  fetchAllHeroes,
  fetchPlayerHeroes,
  fetchPlayerCounts,
  fetchPlayerRatings,
  fetchMatchDetails,
  heroIconUrl,
  getGameModeName,
  getLaneRoleName,
  type OpenDotaMatch,
  type OpenDotaHero,
  type FullMatchDetails,
} from '@/lib/opendota';
import { getRankInfo } from '@/lib/ranks';
import { assignTeamPositions, POS_ROMAN, POS_NAME_RU, POS_FULL_RU, DotaPosition } from '@/lib/positions';
import { PublicProfile } from '@/components/profile/PublicProfile';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PlayerPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params;
  const STEAM64_BASE = BigInt("76561197960265728");
  let accountId = Number(id);

  try {
    const big = BigInt(id);
    if (big > STEAM64_BASE) {
      accountId = Number(big - STEAM64_BASE);
    }
  } catch {}

  // Resolve Steam custom vanity name (e.g. /player/dendi)
  if (isNaN(accountId) || accountId <= 0) {
    try {
      const res = await fetch(`https://steamcommunity.com/id/${id}/?xml=1`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const text = await res.text();
        const steamId64Str = text.match(/<steamID64>(\d+)<\/steamID64>/)?.[1];
        if (steamId64Str) {
          const big = BigInt(steamId64Str);
          if (big > STEAM64_BASE) {
            accountId = Number(big - STEAM64_BASE);
          }
        }
      }
    } catch {}
  }

  if (isNaN(accountId) || accountId <= 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md p-8 text-center space-y-4 shadow-xl">
          <h2 className="text-xl font-bold text-rose-400">Неверный Steam ID</h2>
          <p className="text-xs text-zinc-400">Указан некорректный идентификатор профиля.</p>
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition">
            <ArrowLeft className="size-4" /> На главную
          </Link>
        </div>
      </div>
    );
  }

  // Proactively request Valve Steam API sync in the background to discover missing matches
  fetch(`https://api.opendota.com/api/players/${accountId}/refresh`, { method: 'POST' }).catch(() => {});

  const [playerData, wl, recentMatchesData, allHeroes, heroStats, counts, ratings] = await Promise.all([
    fetchPlayerProfile(accountId),
    fetchPlayerWinLoss(accountId),
    fetchRecentMatches(accountId, 100),
    fetchAllHeroes(),
    fetchPlayerHeroes(accountId),
    fetchPlayerCounts(accountId),
    fetchPlayerRatings(accountId),
  ]);

  let recentMatches = recentMatchesData;

  // Merge with local SQLite Dota database to ensure 100% data persistence and speed
  try {
    const { getPlayerMatchesFromDb, savePlayerProfileToDb, getDotaMatchFromDb } = await import("@/lib/dota-match-db");
    if (playerData?.profile) {
      savePlayerProfileToDb({
        accountId,
        personaName: playerData.profile.personaname,
        avatarUrl: playerData.profile.avatarfull,
        rankTier: playerData.rank_tier ?? undefined,
        leaderboardRank: playerData.leaderboard_rank ?? undefined,
        currentMmr: playerData.mmr_estimate?.estimate ?? undefined,
        wins: wl?.win ?? undefined,
        losses: wl?.lose ?? undefined,
      }).catch(() => {});
    }

    // Register player in autonomous background auto-updater
    try {
      const { trackPlayerId } = await import("@/lib/dota-auto-updater");
      trackPlayerId(accountId);
    } catch {}

    const dbMatches = await getPlayerMatchesFromDb(accountId, 100);
    if (dbMatches.length > 0) {
      const matchMap = new Map<number, OpenDotaMatch>();
      for (const m of dbMatches) {
        matchMap.set(m.match_id, m);
      }
      for (const m of recentMatches) {
        const existing = matchMap.get(m.match_id);
        if (existing) {
          matchMap.set(m.match_id, {
            ...existing,
            ...m,
            item_0: existing.item_0 ?? m.item_0,
            item_1: existing.item_1 ?? m.item_1,
            item_2: existing.item_2 ?? m.item_2,
            item_3: existing.item_3 ?? m.item_3,
            item_4: existing.item_4 ?? m.item_4,
            item_5: existing.item_5 ?? m.item_5,
            item_neutral: existing.item_neutral ?? m.item_neutral,
            backpack_0: existing.backpack_0 ?? m.backpack_0,
            backpack_1: existing.backpack_1 ?? m.backpack_1,
            backpack_2: existing.backpack_2 ?? m.backpack_2,
          });
        } else {
          matchMap.set(m.match_id, m);
        }
      }
      recentMatches = Array.from(matchMap.values())
        .sort((a, b) => (b.start_time || 0) - (a.start_time || 0))
        .slice(0, 100);
    }

    // Enrich ALL matches across full history with items if missing from DB
    const missingItems = recentMatches.filter(
      (m) => m.item_0 === undefined || (m.item_0 === 0 && m.item_1 === 0 && m.item_2 === 0)
    );
    if (missingItems.length > 0) {
      await Promise.all(
        missingItems.map(async (m) => {
          try {
            const dbM = await getDotaMatchFromDb(m.match_id);
            if (dbM && dbM.players) {
              const p = dbM.players.find(
                (x) =>
                  (x.account_id && x.account_id === accountId) ||
                  x.player_slot === m.player_slot ||
                  x.hero_id === m.hero_id
              );
              if (p) {
                m.item_0 = p.item_0;
                m.item_1 = p.item_1;
                m.item_2 = p.item_2;
                m.item_3 = p.item_3;
                m.item_4 = p.item_4;
                m.item_5 = p.item_5;
                m.item_neutral = p.item_neutral;
                m.backpack_0 = p.backpack_0;
                m.backpack_1 = p.backpack_1;
                m.backpack_2 = p.backpack_2;
                if (p.net_worth) m.net_worth = p.net_worth;
                if (p.hero_damage) m.hero_damage = p.hero_damage;
                if (p.level) m.level = p.level;
              }
            }
          } catch {}
        })
      );
    }
  } catch {}

  // Fetch verified match details for all 20 recent games in parallel so ALL 20 recent matches display full items & rosters
  const top20Matches = recentMatches.slice(0, 20);
  const matchDetailsList = await Promise.all(
    top20Matches.map((m) => fetchMatchDetails(m.match_id).catch(() => null))
  );

  const detailsByMatchId = new Map<number, FullMatchDetails>();
  matchDetailsList.forEach((d) => {
    if (d) detailsByMatchId.set(Number(d.match_id), d);
  });
  const lastMatchDetails = recentMatches[0] ? (detailsByMatchId.get(Number(recentMatches[0].match_id)) ?? null) : null;

  // Support for new/uncalibrated accounts or players with unparsed profiles
  let effectivePlayer = playerData;
  if (!effectivePlayer?.profile) {
    effectivePlayer = {
      tracked_until: null,
      solo_competitive_rank: null,
      competitive_rank: null,
      rank_tier: null,
      leaderboard_rank: null,
      profile: {
        account_id: accountId,
        personaname: (recentMatches[0] as any)?.personaname || `Игрок #${accountId}`,
        name: null,
        plus: false,
        cheese: 0,
        steamid: String(accountId),
        avatar: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
        avatarmedium: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
        avatarfull: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
        profileurl: `https://steamcommunity.com/profiles/${accountId}`,
        last_login: null,
        loccountrycode: null,
      },
    };
  }

  const heroMap = new Map<number, OpenDotaHero>(allHeroes.map((h) => [h.id, h]));

  let effectiveHeroStats = heroStats;
  if (!effectiveHeroStats || effectiveHeroStats.length === 0) {
    const heroStatMap: Record<number, { hero_id: number; games: number; win: number; last_played: number; with_games: number; with_win: number; against_games: number; against_win: number }> = {};
    for (const m of recentMatches) {
      if (!heroStatMap[m.hero_id]) {
        heroStatMap[m.hero_id] = { hero_id: m.hero_id, games: 0, win: 0, last_played: 0, with_games: 0, with_win: 0, against_games: 0, against_win: 0 };
      }
      heroStatMap[m.hero_id].games++;
      const isRad = m.player_slot < 128;
      const won = isRad ? m.radiant_win : !m.radiant_win;
      if (won) heroStatMap[m.hero_id].win++;
      if (m.start_time > heroStatMap[m.hero_id].last_played) {
        heroStatMap[m.hero_id].last_played = m.start_time;
      }
    }
    effectiveHeroStats = Object.values(heroStatMap);
  }

  const enrichedMatches = recentMatches.map((m: OpenDotaMatch) => {
    const hero = heroMap.get(m.hero_id);
    const isRadiant = m.player_slot < 128;
    const won = isRadiant ? m.radiant_win : !m.radiant_win;
    const mDetail = detailsByMatchId.get(Number(m.match_id));
    const pDetail = mDetail?.players.find(
      (p) =>
        (p.account_id && p.account_id === accountId) ||
        p.player_slot === m.player_slot ||
        p.hero_id === m.hero_id
    );

    return {
      ...m,
      won,
      isRadiant,
      hero,
      heroIconUrl: hero ? heroIconUrl(hero.name) : null,
      gameModeName: getGameModeName(m.game_mode),
      laneRoleName: getLaneRoleName(pDetail?.lane_role ?? m.lane_role),
      item_0: pDetail?.item_0 ?? m.item_0 ?? 0,
      item_1: pDetail?.item_1 ?? m.item_1 ?? 0,
      item_2: pDetail?.item_2 ?? m.item_2 ?? 0,
      item_3: pDetail?.item_3 ?? m.item_3 ?? 0,
      item_4: pDetail?.item_4 ?? m.item_4 ?? 0,
      item_5: pDetail?.item_5 ?? m.item_5 ?? 0,
      backpack_0: pDetail?.backpack_0 ?? m.backpack_0 ?? 0,
      backpack_1: pDetail?.backpack_1 ?? m.backpack_1 ?? 0,
      backpack_2: pDetail?.backpack_2 ?? m.backpack_2 ?? 0,
      item_neutral: pDetail?.item_neutral ?? m.item_neutral ?? 0,
      level: pDetail?.level ?? (m as any).level ?? 1,
      net_worth: pDetail?.net_worth ?? (m as any).net_worth ?? 0,
    };
  });

  // Pre-format rosters for 0ms instant display without fetching
  const initialMatchDetails: Record<number, any> = {};
  for (const [mid, detail] of detailsByMatchId.entries()) {
    if (!detail || !detail.players) continue;
    const radRaw = detail.players.filter((p) => p.player_slot < 128);
    const direRaw = detail.players.filter((p) => p.player_slot >= 128);
    const radPos = assignTeamPositions(
      radRaw.map((p) => ({
        player_slot: p.player_slot,
        hero_id: p.hero_id,
        last_hits: p.last_hits,
        net_worth: p.net_worth,
        lane: p.lane,
        lane_role: p.lane_role,
        duration: detail.duration,
      }))
    );
    const direPos = assignTeamPositions(
      direRaw.map((p) => ({
        player_slot: p.player_slot,
        hero_id: p.hero_id,
        last_hits: p.last_hits,
        net_worth: p.net_worth,
        lane: p.lane,
        lane_role: p.lane_role,
        duration: detail.duration,
      }))
    );

    const formattedPlayers = detail.players.map((p) => {
      const h = heroMap.get(p.hero_id);
      const isRad = p.player_slot < 128;
      const assigned = (isRad ? radPos.get(p.player_slot) : direPos.get(p.player_slot)) as DotaPosition;
      const vPos = assigned ?? 1;
      return {
        ...p,
        hero_name: h?.localized_name || `Герой #${p.hero_id}`,
        hero_icon: h ? heroIconUrl(h.name) : null,
        pos_role: vPos,
        pos_roman: POS_ROMAN[vPos],
        pos_name: POS_NAME_RU[vPos],
        pos_full: POS_FULL_RU[vPos],
      };
    });

    initialMatchDetails[mid] = {
      match_id: mid,
      radiant_win: detail.radiant_win,
      duration: detail.duration,
      start_time: detail.start_time,
      game_mode_name: detail.game_mode_name || "All Pick",
      radiant_score: detail.radiant_score,
      dire_score: detail.dire_score,
      players: formattedPlayers,
    };
  }

  const rankInfo = getRankInfo(effectivePlayer?.rank_tier ?? null);

  return (
    <PublicProfile
      accountId={accountId}
      profile={effectivePlayer}
      wl={wl}
      matches={enrichedMatches}
      heroStats={effectiveHeroStats}
      counts={counts}
      heroMap={Object.fromEntries(heroMap)}
      rankInfo={rankInfo}
      ratings={ratings}
      lastMatchDetails={lastMatchDetails}
      initialMatchDetails={initialMatchDetails}
    />
  );
}
