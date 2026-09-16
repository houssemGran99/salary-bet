import { NextResponse } from "next/server";
import { readData, mutate, getMonth } from "@/lib/store";
import { monthKey, getMonthOptions } from "@/lib/dates";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || monthKey();
    const data = await readData();
    const monthData = getMonth(data, month);
    return NextResponse.json({ month, ...monthData });
  } catch (err) {
    console.error("GET /api/bets failed:", err);
    return NextResponse.json(
      { error: `${err.name}: ${err.message}` },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const month = (body.month || monthKey()).trim();
    const name = (body.name || "").trim();
    const date = (body.date || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const validDates = new Set(getMonthOptions(month).map((o) => o.iso));
    if (!validDates.has(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const result = await mutate(async (data) => {
      const monthData = getMonth(data, month);
      const existing = monthData.bets.find(
        (b) => b.name.toLowerCase() === name.toLowerCase(),
      );
      if (existing) {
        existing.date = date;
        existing.updatedAt = new Date().toISOString();
      } else {
        monthData.bets.push({
          id: crypto.randomUUID(),
          name,
          date,
          createdAt: new Date().toISOString(),
        });
      }
      data[month] = monthData;
      return [data, monthData];
    });

    return NextResponse.json({ month, ...result });
  } catch (err) {
    console.error("POST /api/bets failed:", err);
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
      const fresh = { bets: [], winningDate: null };
      data[month] = fresh;
      return [data, fresh];
    });

    return NextResponse.json({ month, ...result });
  } catch (err) {
    console.error("DELETE /api/bets failed:", err);
    return NextResponse.json(
      { error: `${err.name}: ${err.message}` },
      { status: 500 },
    );
  }
}
