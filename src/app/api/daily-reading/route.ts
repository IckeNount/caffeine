import { NextResponse } from "next/server";
import { generateDailyReading } from "@/features/daily-reading/lib/generate";

export const runtime = "nodejs";

export async function GET() {
  try {
    const reading = await generateDailyReading();
    return NextResponse.json(reading, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Daily reading error:", error);
    return NextResponse.json(
      { error: "Today's reading is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
