import { Trade } from "./types";

// ── Formatting ──────────────────────────────────────────────
export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

export function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── PnL calc ────────────────────────────────────────────────
export function calcPnl(
  dir: "long" | "short",
  entry: number,
  exit: number,
  qty: number,
  fees: number,
): number {
  const raw = dir === "long" ? (exit - entry) * qty : (entry - exit) * qty;
  return raw - fees;
}

// ── Hold time ───────────────────────────────────────────────
export function holdDuration(entryIso: string, exitIso: string): string {
  const ms = new Date(exitIso).getTime() - new Date(entryIso).getTime();
  const hrs = ms / 3_600_000;
  if (hrs < 1) return `${Math.round(hrs * 60)}m`;
  if (hrs < 24) return `${hrs.toFixed(1)}h`;
  const d = Math.floor(hrs / 24);
  const rem = Math.round(hrs % 24);
  return rem > 0 ? `${d}d ${rem}h` : `${d}d`;
}

// ── Return % ────────────────────────────────────────────────
export function returnPct(t: Trade): number | null {
  if (t.pnl == null || t.entry_price === 0 || t.quantity === 0) return null;
  return (t.pnl / (t.entry_price * t.quantity)) * 100;
}

// ── Stats ───────────────────────────────────────────────────
export interface Stats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalPnl: number;
  totalDeposits: number;
  totalCommissions: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  currentStreak: { type: "win" | "loss" | "none"; count: number };
  avgHoldTime: string;
  expectancy: number;
  longPnl: number;
  shortPnl: number;
  avgTradesPerDay: number;
}

export function computeStats(trades: Trade[]): Stats {
  const closed = trades.filter((t) => t.pnl != null);
  const open = trades.filter((t) => t.pnl == null);
  const wins = closed.filter((t) => t.pnl! > 0);
  const losses = closed.filter((t) => t.pnl! <= 0);

  const totalPnl = closed.reduce((s, t) => s + t.pnl!, 0);
  const totalWins = wins.reduce((s, t) => s + t.pnl!, 0);
  const totalLosses = Math.abs(losses.reduce((s, t) => s + t.pnl!, 0));
  const totalCommissions = trades.reduce((s, t) => s + t.fees, 0);

  // streaks
  const sorted = [...closed].sort(
    (a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime(),
  );
  let maxW = 0, maxL = 0, cW = 0, cL = 0;
  for (const t of sorted) {
    if (t.pnl! > 0) { cW++; cL = 0; maxW = Math.max(maxW, cW); }
    else { cL++; cW = 0; maxL = Math.max(maxL, cL); }
  }
  let currentStreak: Stats["currentStreak"] = { type: "none", count: 0 };
  if (sorted.length > 0) {
    const last = sorted[sorted.length - 1];
    if (last.pnl! > 0) {
      let c = 0;
      for (let i = sorted.length - 1; i >= 0 && sorted[i].pnl! > 0; i--) c++;
      currentStreak = { type: "win", count: c };
    } else {
      let c = 0;
      for (let i = sorted.length - 1; i >= 0 && sorted[i].pnl! <= 0; i--) c++;
      currentStreak = { type: "loss", count: c };
    }
  }

  // hold time
  const holds = closed
    .filter((t) => t.entry_date && t.exit_date)
    .map((t) => (new Date(t.exit_date!).getTime() - new Date(t.entry_date).getTime()) / 3_600_000);
  const avgH = holds.length > 0 ? holds.reduce((a, b) => a + b, 0) / holds.length : 0;

  // long / short
  const longPnl = closed.filter((t) => t.direction === "long").reduce((s, t) => s + t.pnl!, 0);
  const shortPnl = closed.filter((t) => t.direction === "short").reduce((s, t) => s + t.pnl!, 0);

  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
  const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;

  // avg trades per day
  const days = new Set(closed.map((t) => t.exit_date!.slice(0, 10)));

  return {
    totalTrades: trades.length,
    openTrades: open.length,
    closedTrades: closed.length,
    totalPnl,
    totalDeposits: 0,
    totalCommissions,
    winRate,
    avgWin,
    avgLoss,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    bestTrade: wins.length > 0 ? Math.max(...wins.map((t) => t.pnl!)) : 0,
    worstTrade: losses.length > 0 ? Math.min(...losses.map((t) => t.pnl!)) : 0,
    longestWinStreak: maxW,
    longestLoseStreak: maxL,
    currentStreak,
    avgHoldTime: avgH === 0 ? "N/A" : holdDuration(new Date(0).toISOString(), new Date(avgH * 3_600_000).toISOString()),
    expectancy: closed.length > 0 ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss : 0,
    longPnl,
    shortPnl,
    avgTradesPerDay: days.size > 0 ? closed.length / days.size : 0,
  };
}

// ── Equity curve ────────────────────────────────────────────
export function equityCurve(trades: Trade[]): { date: string; equity: number }[] {
  const sorted = trades
    .filter((t) => t.exit_date && t.pnl != null)
    .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime());
  let cum = 0;
  return sorted.map((t) => {
    cum += t.pnl!;
    return { date: t.exit_date!, equity: cum };
  });
}

// ── Calendar data ───────────────────────────────────────────
export interface CalDay {
  date: string;
  pnl: number;
  count: number;
}

export function calendarData(trades: Trade[]): CalDay[] {
  const map: Record<string, { pnl: number; count: number }> = {};
  trades
    .filter((t) => t.exit_date && t.pnl != null)
    .forEach((t) => {
      const d = t.exit_date!.slice(0, 10);
      if (!map[d]) map[d] = { pnl: 0, count: 0 };
      map[d].pnl += t.pnl!;
      map[d].count++;
    });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

// ── Top symbols ─────────────────────────────────────────────
export function topSymbols(trades: Trade[], limit = 5) {
  const map: Record<string, number> = {};
  trades.filter((t) => t.pnl != null).forEach((t) => {
    map[t.ticker] = (map[t.ticker] || 0) + t.pnl!;
  });
  return Object.entries(map)
    .map(([sym, pnl]) => ({ sym, pnl }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, limit);
}
