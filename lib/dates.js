export function pad(n) {
  return String(n).padStart(2, "0");
}

export function isoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function getMonthLabel(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Salary usually lands on the 27th, so it gets the lowest (safest) quota.
// Every day further away, in either direction, adds a fixed step.
const USUAL_PAYDAY = 27;
const WINDOW_START = USUAL_PAYDAY - 5; // 22nd
const BASE_QUOTA = 1.3;
const QUOTA_STEP = 0.15;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getQuota(dt, referenceDate) {
  const diffDays = Math.round((dt - referenceDate) / MS_PER_DAY);
  return Math.round((BASE_QUOTA + QUOTA_STEP * Math.abs(diffDays)) * 100) / 100;
}

// Betting window: 22nd (5 days before the usual 27th payday) through the
// last day of the month, plus the 1st-5th of next month. Weekends are
// excluded since salary never lands on a Saturday/Sunday.
export function getMonthOptions(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const referenceDate = new Date(y, m - 1, USUAL_PAYDAY);
  const opts = [];
  for (let d = WINDOW_START; d <= lastDay; d++) {
    const dt = new Date(y, m - 1, d);
    if (isWeekend(dt)) continue;
    opts.push({
      iso: isoDate(dt),
      day: d,
      weekday: dt.toLocaleDateString("en-US", { weekday: "short" }),
      nextMonth: false,
      quota: getQuota(dt, referenceDate),
    });
  }
  for (let d = 1; d <= 5; d++) {
    const dt = new Date(y, m, d);
    if (isWeekend(dt)) continue;
    opts.push({
      iso: isoDate(dt),
      day: d,
      weekday: dt.toLocaleDateString("en-US", { weekday: "short" }),
      nextMonth: true,
      quota: getQuota(dt, referenceDate),
    });
  }
  return opts;
}

// Betting closes on the 25th so guesses are locked in before the payday
// window (26th onward) starts, preventing bets made with inside knowledge.
export function isBettingOpen(monthStr, now = new Date()) {
  return monthStr === monthKey(now) && now.getDate() <= 25;
}

export function prevMonthKey(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  return monthKey(new Date(y, m - 2, 1));
}

export function nextMonthKey(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  return monthKey(new Date(y, m, 1));
}

export function formatIsoDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
