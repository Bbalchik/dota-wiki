import { NextRequest, NextResponse } from "next/server";
import { fetchMatchDetails, fetchAllHeroes, heroIconUrl, getItemIconUrl, getItemName, getGameModeName, computeDamageBreakdown } from "@/lib/opendota";
import { assignTeamPositions, POS_ROMAN, POS_NAME_RU, POS_FULL_RU, DotaPosition } from "@/lib/positions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = Number(id);

    if (isNaN(matchId) || matchId <= 0) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const [matchDetails, heroes] = await Promise.all([
      fetchMatchDetails(matchId),
      fetchAllHeroes(),
    ]);

    if (!matchDetails) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const heroMap = new Map(heroes.map((h) => [h.id, h]));

    // Compute verified positions for Radiant and Dire using hero archetypes, replay lanes and CS
    const radiantRaw = matchDetails.players.filter((p) => p.player_slot < 128);
    const direRaw = matchDetails.players.filter((p) => p.player_slot >= 128);

    const radPosMap = assignTeamPositions(
      radiantRaw.map((p) => ({
        player_slot: p.player_slot,
        hero_id: p.hero_id,
        last_hits: p.last_hits,
        net_worth: p.net_worth,
        lane: p.lane,
        lane_role: p.lane_role,
        duration: matchDetails.duration,
      }))
    );

    const direPosMap = assignTeamPositions(
      direRaw.map((p) => ({
        player_slot: p.player_slot,
        hero_id: p.hero_id,
        last_hits: p.last_hits,
        net_worth: p.net_worth,
        lane: p.lane,
        lane_role: p.lane_role,
        duration: matchDetails.duration,
      }))
    );

    // Format players with localized hero names, icons, and official positions
    const formattedPlayers = matchDetails.players.map((p) => {
      const hero = heroMap.get(p.hero_id);
      const isRadiant = p.player_slot < 128;
      const assignedPos = (isRadiant ? radPosMap.get(p.player_slot) : direPosMap.get(p.player_slot)) as DotaPosition;
      const verifiedPos = assignedPos ?? 1;

      return {
        ...p,
        hero_name: hero?.localized_name || `Герой #${p.hero_id}`,
        hero_icon: hero ? heroIconUrl(hero.name) : null,
        pos_role: verifiedPos,
        pos_roman: POS_ROMAN[verifiedPos],
        pos_name: POS_NAME_RU[verifiedPos],
        pos_full: POS_FULL_RU[verifiedPos],
        damage_breakdown: p.damage_breakdown || computeDamageBreakdown(p.hero_damage || 0, p.damage_inflictor),
      };
    });

    return NextResponse.json({
      match_id: matchDetails.match_id,
      radiant_win: matchDetails.radiant_win,
      duration: matchDetails.duration,
      start_time: matchDetails.start_time,
      game_mode_name: matchDetails.game_mode_name || "All Pick",
      lobby_type: matchDetails.lobby_type,
      radiant_score: matchDetails.radiant_score,
      dire_score: matchDetails.dire_score,
      radiant_gold_adv: matchDetails.radiant_gold_adv || [],
      radiant_xp_adv: matchDetails.radiant_xp_adv || [],
      is_parsed: matchDetails.is_parsed,
      picks_bans: matchDetails.picks_bans,
      tower_status_radiant: matchDetails.tower_status_radiant,
      tower_status_dire: matchDetails.tower_status_dire,
      barracks_status_radiant: matchDetails.barracks_status_radiant,
      barracks_status_dire: matchDetails.barracks_status_dire,
      first_blood_time: matchDetails.first_blood_time,
      players: formattedPlayers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch match details" },
      { status: 500 }
    );
  }
}
