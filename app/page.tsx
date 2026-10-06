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
  fetchHeroStats,
  fetchProMatches,
  searchPlayers,
  heroIconUrl,
  getItemIconUrl,
  getItemName,
  getGameModeName,
  getLaneRoleName,
  type OpenDotaPlayer,
  type OpenDotaMatch,
  type OpenDotaHero,
} from '@/lib/opendota';
import { cookies } from 'next/headers';
import { getRankInfo } from '@/lib/ranks';
import { getSession, ACTIVE_ACCOUNT_COOKIE } from '@/lib/session';
import { steamId64ToAccountId } from '@/lib/steam-auth';
import { LandingPage } from '@/components/stratz/LandingPage';
import { Dashboard } from '@/components/stratz/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();
  const cookieStore = await cookies();
  const activeCookieVal = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value;

  let accountId: number | null = null;
  let steamId64: string = "";

  if (session) {
    steamId64 = session.steamId;
    accountId = steamId64ToAccountId(session.steamId);
  } else if (activeCookieVal) {
    const parsed = Number(activeCookieVal);
    if (!isNaN(parsed) && parsed > 0) {
      accountId = parsed;
      steamId64 = String(BigInt(accountId) + BigInt("76561197960265728"));
    }
  }

  if (!accountId) {
    const [heroes, proMatches] = await Promise.all([
      fetchHeroStats().catch(() => []),
      fetchProMatches(15).catch(() => []),
    ]);
    return <LandingPage heroes={heroes} proMatches={proMatches} />;
  }

  const [playerData, wl, recentMatchesData, allHeroes, heroStats, counts, ratings] = await Promise.all([
    fetchPlayerProfile(accountId),
    fetchPlayerWinLoss(accountId),
    fetchRecentMatches(accountId, 100),
    fetchAllHeroes(),
    fetchPlayerHeroes(accountId),
    fetchPlayerCounts(accountId),
    fetchPlayerRatings(accountId),
  ]);

  const recentMatches = recentMatchesData;

  const lastMatchId = recentMatches[0]?.match_id;
  const lastMatchDetails = lastMatchId
    ? await fetchMatchDetails(lastMatchId).catch(() => null)
    : null;

  const heroMap = new Map<number, OpenDotaHero>(allHeroes.map((h) => [h.id, h]));

  const enrichedMatches = recentMatches.map((m: OpenDotaMatch) => {
    const hero = heroMap.get(m.hero_id);
    const isRadiant = m.player_slot < 128;
    const won = isRadiant ? m.radiant_win : !m.radiant_win;
    return {
      ...m,
      won,
      isRadiant,
      hero,
      heroIconUrl: hero ? heroIconUrl(hero.name) : null,
      gameModeName: getGameModeName(m.game_mode),
      laneRoleName: getLaneRoleName(m.lane_role),
    };
  });

  const rankInfo = getRankInfo(playerData?.rank_tier ?? null);

  return (
    <Dashboard
      accountId={accountId}
      steamId64={steamId64}
      profile={playerData}
      wl={wl}
      matches={enrichedMatches}
      heroStats={heroStats}
      counts={counts}
      heroMap={Object.fromEntries(heroMap)}
      rankInfo={rankInfo}
      ratings={ratings}
      lastMatchDetails={lastMatchDetails}
    />
  );
}
