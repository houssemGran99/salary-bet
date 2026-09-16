import { NextResponse } from "next/server";
import { mutate, getMonth } from "@/lib/store";
import { monthKey, getMonthOptions } from "@/lib/dates";

export async function POST(request) {
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
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || monthKey();

  const result = await mutate(async (data) => {
    const monthData = getMonth(data, month);
    monthData.winningDate = null;
    data[month] = monthData;
    return [data, monthData];
  });

  return NextResponse.json({ month, ...result });
}
