import { Trade, DashboardStats } from "./types";

export function calculatePnl(
  direction: "long" | "short",
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  fees: number
): number {
  const raw =
    direction === "long"
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity;
  return raw - fees;
}

export function computeStats(trades: Trade[]): DashboardStats {
  const closedTrades = trades.filter((t) => t.pnl !== null);
  const openTrades = trades.filter((t) => t.pnl === null);
  const wins = closedTrades.filter((t) => t.pnl! > 0);
  const losses = closedTrades.filter((t) => t.pnl! <= 0);

  const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl!, 0);
  const totalWins = wins.reduce((sum, t) => sum + t.pnl!, 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl!, 0));

  return {
    totalTrades: trades.length,
    openTrades: openTrades.length,
    totalPnl,
    winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
    avgWin: wins.length > 0 ? totalWins / wins.length : 0,
    avgLoss: losses.length > 0 ? totalLosses / losses.length : 0,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    largestWin: wins.length > 0 ? Math.max(...wins.map((t) => t.pnl!)) : 0,
    largestLoss: losses.length > 0 ? Math.min(...losses.map((t) => t.pnl!)) : 0,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getEquityCurve(trades: Trade[]): { date: string; equity: number }[] {
  const closed = trades
    .filter((t) => t.exit_date && t.pnl !== null)
    .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime());

  let cumulative = 0;
  return closed.map((t) => {
    cumulative += t.pnl!;
    return { date: t.exit_date!, equity: cumulative };
  });
}

export function getMonthlyPnl(trades: Trade[]): { month: string; pnl: number }[] {
  const closed = trades.filter((t) => t.exit_date && t.pnl !== null);
  const monthly: Record<string, number> = {};

  closed.forEach((t) => {
    const d = new Date(t.exit_date!);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly[key] = (monthly[key] || 0) + t.pnl!;
  });

  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => ({ month, pnl }));
}
