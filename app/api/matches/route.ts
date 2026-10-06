import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPlayerMatches, fetchAllHeroes, fetchMatchDetails, getGameModeName, heroIconUrl, type OpenDotaMatch, type OpenDotaHero, type FullMatchDetails } from '@/lib/opendota';
import { getSession } from '@/lib/session';
import { steamId64ToAccountId } from '@/lib/steam-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  let targetAccountId = Number(searchParams.get('accountId'));

  if (!targetAccountId) {
    const session = await getSession();
    if (session) {
      targetAccountId = steamId64ToAccountId(session.steamId);
    }
  }

  if (!targetAccountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }

  const isAll = searchParams.get('all') === 'true';
  const offset = Number(searchParams.get('offset') ?? '0');
  const limitParam = searchParams.get('limit');
  const limit = isAll ? null : Math.min(Number(limitParam ?? '100'), 500);

  const [matches, allHeroes] = await Promise.all([
    fetchAllPlayerMatches(targetAccountId, limit, isAll ? 0 : offset),
    fetchAllHeroes(),
  ]);

  const heroMap = new Map<number, OpenDotaHero>(allHeroes.map((h) => [h.id, h]));

  // Enrich initial chunk of matches with verified match details
  const topMatches = matches.slice(0, 15);
  const detailsList = await Promise.all(
    topMatches.map((m) => fetchMatchDetails(m.match_id).catch(() => null))
  );
  const detailsMap = new Map<number, FullMatchDetails>();
  detailsList.forEach((d) => {
    if (d) detailsMap.set(Number(d.match_id), d);
  });

  const enriched = matches.map((m: OpenDotaMatch) => {
    const hero = heroMap.get(m.hero_id);
    const isRadiant = m.player_slot < 128;
    const won = isRadiant ? m.radiant_win : !m.radiant_win;
    const mDetail = detailsMap.get(Number(m.match_id));
    const pDetail = mDetail?.players.find((p) => p.player_slot === m.player_slot || p.hero_id === m.hero_id);

    return {
      ...m,
      won,
      isRadiant,
      hero: hero ? { id: hero.id, name: hero.name, localized_name: hero.localized_name } : null,
      heroIconUrl: hero ? heroIconUrl(hero.name) : null,
      gameModeName: getGameModeName(m.game_mode),
      laneRoleName: "",
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

  return NextResponse.json(enriched);
}
