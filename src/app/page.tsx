"use client";

import { useState, useMemo } from "react";
import { useTrades } from "@/lib/TradeContext";
import {
  computeStats,
  getEquityCurve,
  formatCurrency,
  formatDate,
  formatPercent,
  getCalendarData,
} from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function HomePage() {
  const { trades, tags, setShowTradeModal, setEditingTrade } = useTrades();
  const stats = computeStats(trades);
  const calendarData = getCalendarData(trades);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [tabMode, setTabMode] = useState<"recent" | "open">("recent");

  // Calculate top symbols by PnL
  const topSymbols = useMemo(() => {
    const symbolMap: Record<string, number> = {};
    trades
      .filter((t) => t.pnl !== null)
      .forEach((t) => {
        symbolMap[t.ticker] = (symbolMap[t.ticker] || 0) + t.pnl!;
      });

    return Object.entries(symbolMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([symbol, pnl]) => ({
        symbol,
        pnl,
      }));
  }, [trades]);

  // Split trades by recent/open
  const recentTrades = useMemo(() => {
    return trades
      .filter((t) => t.pnl !== null)
      .sort(
        (a, b) =>
          new Date(b.exit_date || "").getTime() -
          new Date(a.exit_date || "").getTime()
      )
      .slice(0, 10);
  }, [trades]);

  const openTrades = useMemo(() => {
    return trades
      .filter((t) => t.pnl === null)
      .sort(
        (a, b) =>
          new Date(b.entry_date).getTime() -
          new Date(a.entry_date).getTime()
      );
  }, [trades]);

  const displayedTrades = tabMode === "recent" ? recentTrades : openTrades;

  // Build calendar grid for year
  const calendarByMonth = useMemo(() => {
    const daysByMonth: Record<number, Record<string, any>> = {};
    const dataMap = new Map(calendarData.map((d) => [d.date, d]));

    for (let m = 0; m < 12; m++) {
      daysByMonth[m] = {};
      const date = new Date(selectedYear, m, 1);
      const lastDay = new Date(selectedYear, m + 1, 0).getDate();

      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${selectedYear}-${String(m + 1).padStart(2, "0")}-${String(
          d
        ).padStart(2, "0")}`;
        const data = dataMap.get(dateStr);
        daysByMonth[m][d] = data || null;
      }
    }

    return daysByMonth;
  }, [selectedYear, calendarData]);

  const getColorForPnl = (pnl: number | null): string => {
    if (!pnl) return "bg-card border-card-border";
    if (pnl > 500) return "bg-green/30";
    if (pnl > 100) return "bg-green/20";
    if (pnl > 0) return "bg-green/10";
    if (pnl > -100) return "bg-red/10";
    if (pnl > -500) return "bg-red/20";
    return "bg-red/30";
  };

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Bar */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back! Here's your trading overview.
        </h1>
      </div>

      {/* Top Row: 3 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Account Summary Card */}
        <div className="bg-card border border-card-border rounded-xl p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
              Account Summary
            </p>
            <div className="text-3xl font-bold text-foreground font-mono">
              ${Math.max(
                0,
                (stats.totalPnl || 0) + 10000
              ).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted mt-1">Total Balance</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-1">
                Return %
              </p>
              <p
                className={`text-lg font-bold font-mono ${
                  stats.totalPnl >= 0 ? "text-green" : "text-red"
                }`}
              >
                {formatPercent((stats.totalPnl / 10000) * 100)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-1">
                Open Positions
              </p>
              <p className="text-lg font-bold font-mono text-foreground">
                {stats.openTrades}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-1">
                Total Commissions
              </p>
              <p className="text-sm font-mono text-muted">-$0</p>
            </div>
          </div>

          {/* Win Rate Gauge */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--card-border)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="8"
                  strokeDasharray={`${
                    (stats.winRate / 100) * 251.2
                  } 251.2`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text
                  x="50"
                  y="55"
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="bold"
                  fill="var(--foreground)"
                  fontFamily="monospace"
                >
                  {stats.winRate.toFixed(0)}%
                </text>
              </svg>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">
                Win Rate
              </p>
              <p className="text-sm text-foreground mt-1">
                {stats.closedTrades} closed trades
              </p>
            </div>
          </div>
        </div>

        {/* Performance Metrics Card */}
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">
            Performance Metrics
          </p>
          <div className="space-y-3">
            <MetricRow
              label="Best Trade"
              value={formatCurrency(stats.largestWin)}
              color="text-green"
            />
            <MetricRow
              label="Worst Trade"
              value={formatCurrency(stats.largestLoss)}
              color="text-red"
            />
            <MetricRow
              label="Consecutive Wins"
              value={stats.longestWinStreak}
              color="text-green"
            />
            <MetricRow
              label="Consecutive Losses"
              value={stats.longestLossStreak}
              color="text-red"
            />
            <MetricRow
              label="Avg Time in Trade"
              value={stats.avgHoldTime}
              color="text-muted"
            />
            <MetricRow
              label="Long P&L"
              value={formatCurrency(
                trades
                  .filter((t) => t.direction === "long" && t.pnl !== null)
                  .reduce((sum, t) => sum + t.pnl!, 0)
              )}
              color="text-green"
            />
            <MetricRow
              label="Short P&L"
              value={formatCurrency(
                trades
                  .filter((t) => t.direction === "short" && t.pnl !== null)
                  .reduce((sum, t) => sum + t.pnl!, 0)
              )}
              color="text-green"
            />
          </div>
        </div>

        {/* Top Performing Symbols Card */}
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">
            Top Performing Symbols
          </p>
          {topSymbols.length > 0 ? (
            <div className="space-y-3">
              {topSymbols.map((sym) => (
                <div key={sym.symbol} className="flex items-center gap-3">
                  <div className="w-12">
                    <p className="text-sm font-bold text-accent">
                      {sym.symbol}
                    </p>
                  </div>
                  <div className="flex-1 h-6 bg-card-border rounded overflow-hidden">
                    <div
                      className="h-full bg-green transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (sym.pnl /
                            Math.max(...topSymbols.map((s) => Math.abs(s.pnl)))) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <p
                    className={`text-sm font-mono font-bold w-16 text-right ${
                      sym.pnl > 0 ? "text-green" : "text-red"
                    }`}
                  >
                    {formatCurrency(sym.pnl)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No closed trades yet</p>
          )}
        </div>
      </div>

      {/* Performance Streaks Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StreakCard
          title="Longest Winning Streak"
          count={stats.longestWinStreak}
          type="win"
        />
        <StreakCard
          title="Longest Losing Streak"
          count={stats.longestLossStreak}
          type="loss"
        />
        <StreakCard
          title={`Current ${stats.currentStreak.type === "none" ? "" : stats.currentStreak.type.toUpperCase()} Streak`}
          count={stats.currentStreak.count}
          type={stats.currentStreak.type}
        />
      </div>

      {/* Calendar Heatmap */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Calendar Heatmap
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedYear(selectedYear - 1)}
              className="px-2 py-1 text-sm text-muted hover:text-foreground transition-colors"
            >
              {"<"}
            </button>
            <span className="text-sm font-mono font-bold text-foreground w-12 text-center">
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear(selectedYear + 1)}
              className="px-2 py-1 text-sm text-muted hover:text-foreground transition-colors"
            >
              {">"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {monthNames.map((monthName, monthIndex) => (
            <div key={monthIndex} className="space-y-1">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                {monthName}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {Array.from(
                  {
                    length: new Date(selectedYear, monthIndex + 1, 0).getDate(),
                  },
                  (_, i) => {
                    const dayNum = i + 1;
                    const data = calendarByMonth[monthIndex][dayNum];
                    return (
                      <div
                        key={dayNum}
                        className={`w-6 h-6 rounded border transition-all cal-cell ${getColorForPnl(
                          data?.pnl || null
                        )} ${
                          data
                            ? "cursor-pointer border-card-border/50"
                            : "border-transparent"
                        }`}
                        title={
                          data
                            ? `${data.date}: ${formatCurrency(data.pnl)} (${data.tradeCount} trades)`
                            : ""
                        }
                      />
                    );
                  }
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent/Open Trades Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-card-border">
          <button
            onClick={() => setTabMode("recent")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tabMode === "recent"
                ? "text-foreground tab-active"
                : "text-muted hover:text-foreground"
            }`}
          >
            Recent Trades
          </button>
          <button
            onClick={() => setTabMode("open")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tabMode === "open"
                ? "text-foreground tab-active"
                : "text-muted hover:text-foreground"
            }`}
          >
            Open Trades {stats.openTrades > 0 && `(${stats.openTrades})`}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card/50 border-b border-card-border">
                <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">
                  Symbol
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">
                  Direction
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Entry Price
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Exit Price
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Return %
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  P&L
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">
                  Strategy
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedTrades.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-muted text-sm"
                  >
                    {tabMode === "recent"
                      ? "No closed trades yet"
                      : "No open trades"}
                  </td>
                </tr>
              ) : (
                displayedTrades.map((trade) => {
                  const returnPct =
                    trade.pnl !== null &&
                    trade.entry_price > 0 &&
                    trade.quantity > 0
                      ? (trade.pnl / (trade.entry_price * trade.quantity)) * 100
                      : null;

                  return (
                    <tr
                      key={trade.id}
                      className="border-b border-card-border hover:bg-card/50 transition-colors cursor-pointer trade-row"
                      onClick={() => {
                        setEditingTrade(trade);
                        setShowTradeModal(true);
                      }}
                    >
                      <td className="px-4 py-3 text-muted">
                        {formatDate(
                          tabMode === "recent"
                            ? trade.exit_date || ""
                            : trade.entry_date
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-accent">
                        {trade.ticker}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            trade.direction === "long"
                              ? "text-green"
                              : "text-red"
                          }`}
                        >
                          {trade.direction === "long" ? "↑ LONG" : "↓ SHORT"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {formatCurrency(trade.entry_price)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted">
                        {trade.exit_price !== null
                          ? formatCurrency(trade.exit_price)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {trade.quantity}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono text-xs font-bold ${
                          returnPct === null
                            ? "text-muted"
                            : returnPct > 0
                              ? "text-green"
                              : "text-red"
                        }`}
                      >
                        {returnPct !== null ? `${returnPct.toFixed(2)}%` : "-"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold ${
                          trade.pnl === null
                            ? "text-muted"
                            : trade.pnl > 0
                              ? "text-green"
                              : "text-red"
                        }`}
                      >
                        {trade.pnl !== null ? formatCurrency(trade.pnl) : "-"}
                      </td>
                      <td className="px-4 py-3 text-left">
                        {trade.strategy_tags && trade.strategy_tags.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-accent/10 text-accent">
                            {trade.strategy_tags[0]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper Component: Metric Row
function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-card-border/30 last:border-b-0">
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}

// Helper Component: Streak Card
function StreakCard({
  title,
  count,
  type,
}: {
  title: string;
  count: number;
  type: "win" | "loss" | "none";
}) {
  const getColor = () => {
    if (type === "win") return "text-green";
    if (type === "loss") return "text-red";
    return "text-muted";
  };

  const getBgColor = () => {
    if (type === "win") return "bg-green/10 border-green/20";
    if (type === "loss") return "bg-red/10 border-red/20";
    return "bg-card-border/20 border-card-border/30";
  };

  return (
    <div className={`bg-card border border-card-border rounded-xl p-6 ${getBgColor()}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
        {title}
      </p>
      <div className="flex items-center justify-center">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--card-border)"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={
                type === "win"
                  ? "var(--green)"
                  : type === "loss"
                    ? "var(--red)"
                    : "var(--muted)"
              }
              strokeWidth="6"
              strokeDasharray={`${Math.min(count * 15, 282.7)} 282.7`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute text-center">
            <p className={`text-2xl font-bold font-mono ${getColor()}`}>
              {count}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
