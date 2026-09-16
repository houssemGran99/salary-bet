import { NextResponse } from "next/server";
import { mutate, getMonth } from "@/lib/store";
import { monthKey, getMonthOptions } from "@/lib/dates";

export async function POST(request) {
  try {
    const body = await request.json();
    const month = (body.month || monthKey()).trim();
    const date = (body.date || "").trim();

    const validDates = new Set(getMonthOptions(month).map((o) => o.iso));
    if (!validDates.has(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const result = await mutate(async (data) => {
      const monthData = getMonth(data, month);
      monthData.winningDate = date;
      data[month] = monthData;
      return [data, monthData];
    });

    return NextResponse.json({ month, ...result });
  } catch (err) {
    console.error("POST /api/bets/win failed:", err);
    return NextResponse.json(
      { error: `${err.name}: ${err.message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || monthKey();

    const result = await mutate(async (data) => {
      const monthData = getMonth(data, month);
      monthData.winningDate = null;
      data[month] = monthData;
      return [data, monthData];
    });

    return NextResponse.json({ month, ...result });
  } catch (err) {
    console.error("DELETE /api/bets/win failed:", err);
    return NextResponse.json(
      { error: `${err.name}: ${err.message}` },
      { status: 500 },
    );
  }
}
