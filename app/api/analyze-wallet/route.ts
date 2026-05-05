import { NextRequest, NextResponse } from "next/server";
import { analyzeWallet } from "@/lib/goldrush";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    if (!address || typeof address !== "string" || address.length < 32) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address" },
        { status: 400 },
      );
    }

    const result = await analyzeWallet(address);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Failed to analyze wallet" },
      { status: 500 },
    );
  }
}
