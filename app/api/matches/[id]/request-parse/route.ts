import { NextRequest, NextResponse } from "next/server";
import { fetchMatchDetails, clearAllCache } from "@/lib/opendota";
import { saveDotaMatchToDb } from "@/lib/dota-match-db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;

    // 1. Send parse request to Valve/OpenDota gateway
    const parseRes = await fetch(
      `https://api.opendota.com/api/request/${matchId}`,
      {
        method: "POST",
      }
    );

    let jobId = null;
    if (parseRes.ok) {
      const parseData = await parseRes.json().catch(() => ({}));
      jobId = parseData.job?.jobId;
    }

    // Wait a brief moment for worker to process or update
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // 2. Fetch fresh match data directly
    const res = await fetch(`https://api.opendota.com/api/matches/${matchId}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const rawData = await res.json();
      clearAllCache();
      const updatedDetails = await fetchMatchDetails(matchId);

      if (updatedDetails) {
        await saveDotaMatchToDb(updatedDetails, rawData);
        return NextResponse.json({
          success: true,
          message: "Запрос на парсинг отправлен в Valve GC. Данные обновлены!",
          isParsed: updatedDetails.is_parsed,
          match: updatedDetails,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Запрос на парсинг принят очередью Valve.",
    });
  } catch (error: any) {
    console.error("Error requesting parse from Valve:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Parse request failed" },
      { status: 500 }
    );
  }
}
