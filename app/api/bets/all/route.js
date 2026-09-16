import { NextResponse } from "next/server";
import { mutate } from "@/lib/store";

export async function DELETE() {
  try {
    await mutate(async () => [{}, null]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/bets/all failed:", err);
    return NextResponse.json(
      { error: `${err.name}: ${err.message}` },
      { status: 500 },
    );
  }
}
