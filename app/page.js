"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  monthKey,
  getMonthLabel,
  getMonthOptions,
  prevMonthKey,
  nextMonthKey,
  formatIsoDate,
} from "@/lib/dates";

const CURRENT_MONTH = monthKey();

// Safely parses a fetch Response as JSON (tolerating an empty body) and
// throws a readable error when the request failed.
async function parseResponse(res) {
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // non-JSON body (e.g. a platform error page) — fall through
    }
  }
  if (!res.ok) {
    throw new Error(data.error || `Server error (${res.status})`);
  }
  return data;
}

export default function Home() {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [bets, setBets] = useState([]);
  const [winningDate, setWinningDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [winnerPickDate, setWinnerPickDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const options = useMemo(() => getMonthOptions(month), [month]);
  const isCurrentMonth = month === CURRENT_MONTH;

  const load = useCallback(async (m) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bets?month=${encodeURIComponent(m)}`);
      const data = await parseResponse(res);
      setBets(data.bets || []);
      setWinningDate(data.winningDate || null);
    } catch (e) {
      setError(`Couldn't load bets: ${e.message}. Try refreshing.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  useEffect(() => {
    // remember your name on this device for convenience
    try {
      const saved = localStorage.getItem("payday-predictor-name");
      if (saved) setName(saved);
    } catch {}
  }, []);

  const countsByDate = useMemo(() => {
    const map = {};
    for (const b of bets) {
      map[b.date] = (map[b.date] || 0) + 1;
    }
    return map;
  }, [bets]);

  const myExistingBet = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return null;
    return bets.find((b) => b.name.toLowerCase() === trimmed) || null;
  }, [bets, name]);

  const winners = useMemo(() => {
    if (!winningDate) return [];
    return bets.filter((b) => b.date === winningDate);
  }, [bets, winningDate]);

  async function placeBet() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter your name first.");
      return;
    }
    if (!selectedDate) {
      setError("Pick a date to bet on.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, name: trimmedName, date: selectedDate }),
      });
      const data = await parseResponse(res);
      setBets(data.bets || []);
      setWinningDate(data.winningDate ?? null);
      try {
        localStorage.setItem("payday-predictor-name", trimmedName);
      } catch {}
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function markWinner() {
    if (!winnerPickDate) return;
    if (!confirm(`Mark ${formatIsoDate(winnerPickDate)} as the winning date?`))
      return;
    setError("");
    try {
      const res = await fetch("/api/bets/win", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, date: winnerPickDate }),
      });
      const data = await parseResponse(res);
      setBets(data.bets || []);
      setWinningDate(data.winningDate ?? null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function clearWinner() {
    if (!confirm("Unmark the winning date?")) return;
    setError("");
    try {
      const res = await fetch(
        `/api/bets/win?month=${encodeURIComponent(month)}`,
        { method: "DELETE" },
      );
      const data = await parseResponse(res);
      setBets(data.bets || []);
      setWinningDate(data.winningDate ?? null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function resetMonth() {
    if (
      !confirm(
        `Delete all bets for ${getMonthLabel(month)}? This can't be undone.`,
      )
    )
      return;
    setError("");
    try {
      const res = await fetch(`/api/bets?month=${encodeURIComponent(month)}`, {
        method: "DELETE",
      });
      const data = await parseResponse(res);
      setBets(data.bets || []);
      setWinningDate(data.winningDate ?? null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function clearAll() {
    if (!confirm("Delete ALL bets for every month? This can't be undone."))
      return;
    setError("");
    try {
      const res = await fetch("/api/bets/all", { method: "DELETE" });
      await parseResponse(res);
      load(month);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 dark:from-violet-950 dark:via-fuchsia-950 dark:to-slate-900">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
        <header className="text-center text-white">
          <h1 className="text-4xl font-extrabold tracking-tight drop-shadow-sm sm:text-5xl">
            💰 Payday Predictor
          </h1>
          <p className="mt-2 text-white/90">
            Bet on which day the salary actually lands.
          </p>
        </header>

        <div className="flex items-center justify-center gap-3 text-white">
          <button
            onClick={() => setMonth((m) => prevMonthKey(m))}
            className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur transition hover:bg-white/30"
          >
            ← Prev
          </button>
          <div className="min-w-[12rem] text-center text-lg font-semibold">
            {getMonthLabel(month)}
            {isCurrentMonth && (
              <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
                Current
              </span>
            )}
          </div>
          <button
            onClick={() => setMonth((m) => nextMonthKey(m))}
            className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur transition hover:bg-white/30"
          >
            Next →
          </button>
        </div>

        {winningDate && (
          <div className="rounded-2xl bg-white/95 p-5 text-center shadow-xl dark:bg-slate-800/95">
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              🎉 Winning date
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {formatIsoDate(winningDate)}
            </p>
            {winners.length > 0 ? (
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Winners:{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {winners.map((w) => w.name).join(", ")}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Nobody bet on this date.
              </p>
            )}
          </div>
        )}

        <section className="rounded-2xl bg-white/95 p-5 shadow-xl dark:bg-slate-800/95">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Your name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          {myExistingBet && (
            <p className="mt-1 text-xs text-violet-600 dark:text-violet-300">
              You already bet on {formatIsoDate(myExistingBet.date)}. Picking
              a new date will change your bet.
            </p>
          )}

          <p className="mt-4 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Pick a date
          </p>
          {loading ? (
            <p className="text-slate-500 dark:text-slate-400">Loading…</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {options.map((opt) => {
                const count = countsByDate[opt.iso] || 0;
                const isSelected = selectedDate === opt.iso;
                const isMine = myExistingBet?.date === opt.iso;
                const isWinning = winningDate === opt.iso;
                return (
                  <button
                    key={opt.iso}
                    onClick={() => setSelectedDate(opt.iso)}
                    className={[
                      "relative flex flex-col items-center rounded-xl border-2 px-2 py-2.5 transition",
                      isWinning
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                        : isSelected
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                          : isMine
                            ? "border-violet-300 bg-violet-50/50 dark:border-violet-700 dark:bg-violet-900/10"
                            : "border-slate-200 hover:border-violet-300 dark:border-slate-600",
                    ].join(" ")}
                  >
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {opt.weekday}
                    </span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {opt.day}
                      {opt.nextMonth && (
                        <sup className="text-[10px] text-slate-400">next</sup>
                      )}
                    </span>
                    {count > 0 && (
                      <span className="mt-1 rounded-full bg-slate-900/80 px-1.5 text-[10px] font-semibold text-white dark:bg-white/20">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={placeBet}
            disabled={submitting || !isCurrentMonth}
            className="mt-4 w-full rounded-lg bg-violet-600 py-2.5 font-semibold text-white shadow transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCurrentMonth
              ? submitting
                ? "Placing bet…"
                : myExistingBet
                  ? "Update Bet"
                  : "Place Bet"
              : "Betting closed for this month"}
          </button>
        </section>

        <section className="rounded-2xl bg-white/95 p-5 shadow-xl dark:bg-slate-800/95">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            All bets ({bets.length})
          </h2>
          {bets.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No bets yet. Be the first!
            </p>
          ) : (
            <ul className="space-y-2">
              {[...options]
                .filter((opt) => countsByDate[opt.iso])
                .map((opt) => (
                  <li key={opt.iso} className="flex items-start gap-3">
                    <span
                      className={[
                        "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                        winningDate === opt.iso
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                      ].join(" ")}
                    >
                      {opt.day}
                      {opt.nextMonth ? " next" : ""}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {bets
                        .filter((b) => b.date === opt.iso)
                        .map((b) => b.name)
                        .join(", ")}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <details className="rounded-2xl bg-white/80 p-5 shadow-lg dark:bg-slate-800/80">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
            Admin: mark winner & manage data
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={winnerPickDate}
                onChange={(e) => setWinnerPickDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Select the actual payday…</option>
                {options.map((opt) => (
                  <option key={opt.iso} value={opt.iso}>
                    {formatIsoDate(opt.iso)}
                  </option>
                ))}
              </select>
              <button
                onClick={markWinner}
                disabled={!winnerPickDate}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark Winning Date
              </button>
              {winningDate && (
                <button
                  onClick={clearWinner}
                  className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
                >
                  Unmark
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <button
                onClick={resetMonth}
                className="rounded-lg bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
              >
                Reset {getMonthLabel(month)}
              </button>
              <button
                onClick={clearAll}
                className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
              >
                Clear all data
              </button>
            </div>
          </div>
        </details>
      </main>
    </div>
  );
}
