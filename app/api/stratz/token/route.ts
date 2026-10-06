import { NextRequest, NextResponse } from "next/server";
import {
  getStratzToken,
  saveStratzToken,
  clearStratzToken,
  validateStratzToken,
  isStratzConfigured,
} from "@/lib/stratz";

export async function GET() {
  const configured = isStratzConfigured();
  const token = getStratzToken();
  const maskedToken = token
    ? `${token.slice(0, 6)}...${token.slice(-4)}`
    : null;

  return NextResponse.json({
    configured,
    maskedToken,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      clearStratzToken();
      return NextResponse.json({
        success: true,
        configured: false,
        message: "Stratz API токен удален",
      });
    }

    const isValid = await validateStratzToken(token);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Недействительный токен Stratz API. Проверьте правильность токена на https://stratz.com/api",
        },
        { status: 400 }
      );
    }

    saveStratzToken(token);

    return NextResponse.json({
      success: true,
      configured: true,
      message: "Stratz GraphQL токен успешно подключен!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update Stratz token" },
      { status: 500 }
    );
  }
}
