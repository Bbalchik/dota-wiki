import { NextRequest, NextResponse } from "next/server";
import {
  listDbMatches,
  getDatabaseStats,
  syncRecentDotaMatches,
} from "@/lib/dota-match-db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 15);
    const search = searchParams.get("search") || undefined;
    const heroId = searchParams.get("heroId")
      ? Number(searchParams.get("heroId"))
      : undefined;
    const gameMode = searchParams.get("gameMode")
      ? Number(searchParams.get("gameMode"))
      : undefined;
    const radiantWin =
      searchParams.get("radiantWin") !== null
        ? searchParams.get("radiantWin") === "true"
        : undefined;
    const isParsed =
      searchParams.get("isParsed") !== null
        ? searchParams.get("isParsed") === "true"
        : undefined;

    const [data, stats] = await Promise.all([
      listDbMatches({ page, limit, search, heroId, gameMode, radiantWin, isParsed }),
      getDatabaseStats(),
    ]);

    return NextResponse.json({
      success: true,
      ...data,
      stats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("API /api/database error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load database" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body.limit || 15);

    const result = await syncRecentDotaMatches(limit);

    return NextResponse.json({
      success: true,
      message: `Синхронизировано ${result.added} новых матчей напрямую с серверов Dota 2`,
      ...result,
    });
  } catch (error: any) {
    console.error("API /api/database sync error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Sync failed" },
      { status: 500 }
    );
  }
}
