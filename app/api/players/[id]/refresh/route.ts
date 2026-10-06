import { NextRequest, NextResponse } from "next/server";
import { clearPlayerCache, fetchPlayerProfile } from "@/lib/opendota";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accountId = Number(id);

  if (isNaN(accountId) || accountId <= 0) {
    return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
  }

  try {
    // 1. Invalidate local in-memory cache
    clearPlayerCache(accountId);

    // 2. Fetch fresh profile via OpenDota or Steam Public XML & persist to DB
    const playerData = await fetchPlayerProfile(accountId);

    // 3. Proactively queue OpenDota replay crawler in the background
    fetch(`https://api.opendota.com/api/players/${accountId}/refresh`, {
      method: "POST",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      personaName: playerData?.profile?.personaname ?? `Игрок #${accountId}`,
      avatarUrl: playerData?.profile?.avatarfull ?? null,
      message: "Профиль успешно обновлен и поставлен в очередь синхронизации со Steam",
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      message: e?.message || "Ошибка обновления профиля",
    });
  }
}
