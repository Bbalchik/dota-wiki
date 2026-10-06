import { NextRequest, NextResponse } from "next/server";
import { clearPlayerCache } from "@/lib/opendota";

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

    // 2. Send refresh request to OpenDota to sync latest matches from Valve Steam API
    const res = await fetch(`https://api.opendota.com/api/players/${accountId}/refresh`, {
      method: "POST",
    });

    return NextResponse.json({
      success: true,
      status: res.status,
      message: "Синхронизация отправлена в очередь Steam и OpenDota",
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      message: e?.message || "Ошибка отправки запроса",
    });
  }
}
