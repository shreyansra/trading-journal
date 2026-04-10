export interface Trade {
  id: string;
  ticker: string;
  direction: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  entry_date: string;
  exit_date: string | null;
  pnl: number | null;
  fees: number;
  notes: string;
  strategy_tags: string[];
  screenshot_urls: string[];
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TradeFilters {
  search: string;
  direction: "all" | "long" | "short";
  result: "all" | "win" | "loss" | "open";
  tags: string[];
  dateFrom: string;
  dateTo: string;
}

export interface DashboardStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalPnl: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  currentStreak: { type: "win" | "loss" | "none"; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
  avgHoldTime: string;
  expectancy: number;
  avgRiskReward: number;
  todayPnl: number;
  weekPnl: number;
  monthPnl: number;
}

export interface CalendarDay {
  date: string;
  pnl: number;
  tradeCount: number;
}

export interface HoldTimeData {
  ticker: string;
  holdHours: number;
  pnl: number;
}

export interface DayOfWeekData {
  day: string;
  avgPnl: number;
  tradeCount: number;
  winRate: number;
}

export interface PnlDistributionBucket {
  range: string;
  count: number;
}
