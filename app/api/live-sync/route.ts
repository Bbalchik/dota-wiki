import { NextRequest, NextResponse } from "next/server";
import {
  getAutoUpdaterStatus,
  runSyncCycle,
  trackPlayerId,
  startDotaAutoUpdater,
} from "@/lib/dota-auto-updater";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    startDotaAutoUpdater();
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    if (accountId) {
      const id = Number(accountId);
      if (id > 0) trackPlayerId(id);
    }

    const status = await getAutoUpdaterStatus();
    return NextResponse.json({
      success: true,
      status,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch sync status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    startDotaAutoUpdater();
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    if (body.accountId) {
      const id = Number(body.accountId);
      if (id > 0) trackPlayerId(id);
    }

    const result = await runSyncCycle();
    const status = await getAutoUpdaterStatus();

    return NextResponse.json({
      success: true,
      result,
      status,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Manual sync cycle failed" },
      { status: 500 }
    );
  }
}
