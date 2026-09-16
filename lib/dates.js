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

// Betting window: 26th through the last day of the month, plus the 1st-5th of next month.
export function getMonthOptions(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const opts = [];
  for (let d = 26; d <= lastDay; d++) {
    const dt = new Date(y, m - 1, d);
    opts.push({
      iso: isoDate(dt),
      day: d,
      weekday: dt.toLocaleDateString("en-US", { weekday: "short" }),
      nextMonth: false,
    });
  }
  for (let d = 1; d <= 5; d++) {
    const dt = new Date(y, m, d);
    opts.push({
      iso: isoDate(dt),
      day: d,
      weekday: dt.toLocaleDateString("en-US", { weekday: "short" }),
      nextMonth: true,
    });
  }
  return opts;
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
