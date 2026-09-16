import { NextResponse } from "next/server";
import { mutate } from "@/lib/store";

export async function DELETE() {
  await mutate(async () => [{}, null]);
  return NextResponse.json({ ok: true });
}
