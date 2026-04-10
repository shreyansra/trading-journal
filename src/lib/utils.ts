import {
  Trade,
  DashboardStats,
  CalendarDay,
  HoldTimeData,
  DayOfWeekData,
  PnlDistributionBucket,
} from "./types";

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

  // Streaks
  const sortedClosed = [...closedTrades].sort(
    (a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime()
  );

  let currentStreak: { type: "win" | "loss" | "none"; count: number } = {
    type: "none",
    count: 0,
  };
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  for (const t of sortedClosed) {
    if (t.pnl! > 0) {
      tempWinStreak++;
      tempLossStreak = 0;
      if (tempWinStreak > longestWinStreak) longestWinStreak = tempWinStreak;
    } else {
      tempLossStreak++;
      tempWinStreak = 0;
      if (tempLossStreak > longestLossStreak) longestLossStreak = tempLossStreak;
    }
  }

  if (sortedClosed.length > 0) {
    const last = sortedClosed[sortedClosed.length - 1];
    if (last.pnl! > 0) {
      let count = 0;
      for (let i = sortedClosed.length - 1; i >= 0; i--) {
        if (sortedClosed[i].pnl! > 0) count++;
        else break;
      }
      currentStreak = { type: "win", count };
    } else {
      let count = 0;
      for (let i = sortedClosed.length - 1; i >= 0; i--) {
        if (sortedClosed[i].pnl! <= 0) count++;
        else break;
      }
      currentStreak = { type: "loss", count };
    }
  }

  // Hold time
  const holdTimes = closedTrades
    .filter((t) => t.entry_date && t.exit_date)
    .map((t) => {
      const ms = new Date(t.exit_date!).getTime() - new Date(t.entry_date).getTime();
      return ms / (1000 * 60 * 60);
    });
  const avgHoldHours =
    holdTimes.length > 0 ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length : 0;

  // Period P&L
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayPnl = closedTrades
    .filter((t) => t.exit_date?.slice(0, 10) === todayStr)
    .reduce((sum, t) => sum + t.pnl!, 0);

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekPnl = closedTrades
    .filter((t) => t.exit_date && new Date(t.exit_date) >= weekAgo)
    .reduce((sum, t) => sum + t.pnl!, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthPnl = closedTrades
    .filter((t) => t.exit_date && new Date(t.exit_date) >= monthStart)
    .reduce((sum, t) => sum + t.pnl!, 0);

  // Expectancy & risk/reward
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
  const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
  const expectancy =
    closedTrades.length > 0
      ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss
      : 0;
  const avgRiskReward = avgLoss > 0 ? avgWin / avgLoss : 0;

  return {
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    totalPnl,
    winRate,
    avgWin,
    avgLoss,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    largestWin: wins.length > 0 ? Math.max(...wins.map((t) => t.pnl!)) : 0,
    largestLoss: losses.length > 0 ? Math.min(...losses.map((t) => t.pnl!)) : 0,
    currentStreak,
    longestWinStreak,
    longestLossStreak,
    avgHoldTime: formatHoldTime(avgHoldHours),
    expectancy,
    avgRiskReward,
    todayPnl,
    weekPnl,
    monthPnl,
  };
}

function formatHoldTime(hours: number): string {
  if (hours === 0) return "N/A";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(abs);
  return value < 0 ? `-${formatted}` : formatted;
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

export function getCalendarData(trades: Trade[]): CalendarDay[] {
  const closed = trades.filter((t) => t.exit_date && t.pnl !== null);
  const dailyMap: Record<string, { pnl: number; count: number }> = {};

  closed.forEach((t) => {
    const date = t.exit_date!.slice(0, 10);
    if (!dailyMap[date]) dailyMap[date] = { pnl: 0, count: 0 };
    dailyMap[date].pnl += t.pnl!;
    dailyMap[date].count++;
  });

  return Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, pnl: data.pnl, tradeCount: data.count }));
}

export function getHoldTimeData(trades: Trade[]): HoldTimeData[] {
  return trades
    .filter((t) => t.exit_date && t.pnl !== null)
    .map((t) => {
      const ms = new Date(t.exit_date!).getTime() - new Date(t.entry_date).getTime();
      return {
        ticker: t.ticker,
        holdHours: ms / (1000 * 60 * 60),
        pnl: t.pnl!,
      };
    });
}

export function getDayOfWeekData(trades: Trade[]): DayOfWeekData[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayData: Record<number, { totalPnl: number; wins: number; total: number }> = {};

  for (let i = 0; i < 7; i++) {
    dayData[i] = { totalPnl: 0, wins: 0, total: 0 };
  }

  trades
    .filter((t) => t.exit_date && t.pnl !== null)
    .forEach((t) => {
      const dayIndex = new Date(t.exit_date!).getDay();
      dayData[dayIndex].totalPnl += t.pnl!;
      dayData[dayIndex].total++;
      if (t.pnl! > 0) dayData[dayIndex].wins++;
    });

  return days.map((day, i) => ({
    day,
    avgPnl: dayData[i].total > 0 ? dayData[i].totalPnl / dayData[i].total : 0,
    tradeCount: dayData[i].total,
    winRate: dayData[i].total > 0 ? (dayData[i].wins / dayData[i].total) * 100 : 0,
  }));
}

export function getPnlDistribution(trades: Trade[]): PnlDistributionBucket[] {
  const pnls = trades.filter((t) => t.pnl !== null).map((t) => t.pnl!);
  if (pnls.length === 0) return [];

  const min = Math.min(...pnls);
  const max = Math.max(...pnls);
  const range = max - min;
  const bucketCount = Math.min(12, Math.max(5, Math.ceil(pnls.length / 3)));
  const bucketSize = range / bucketCount || 1;

  const buckets: PnlDistributionBucket[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const low = min + i * bucketSize;
    const high = low + bucketSize;
    const count = pnls.filter((p) => p >= low && (i === bucketCount - 1 ? p <= high : p < high)).length;
    buckets.push({
      range: `${formatCurrency(low).replace("$", "")}`,
      count,
    });
  }

  return buckets;
}
