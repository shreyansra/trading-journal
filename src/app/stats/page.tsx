"use client";

import { useTrades } from "@/lib/TradeContext";
import {
  computeStats,
  getEquityCurve,
  getDayOfWeekData,
  formatCurrency,
  formatPercent,
} from "@/lib/utils";
import { Trade } from "@/lib/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function StatsPage() {
  const { trades } = useTrades();
  const stats = computeStats(trades);
  const equityCurve = getEquityCurve(trades);
  const dayOfWeekData = getDayOfWeekData(trades);
  const hourlyData = getHourlyPerformance(trades);

  // Compute tag performance
  const tagPerformance = computeTagPerformance(trades);

  // Compute symbol performance
  const symbolPerformance = computeSymbolPerformance(trades);

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid - Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
        <KpiCard label="WIN RATE" value={formatPercent(stats.winRate)} />
        <KpiCard label="EXPECTANCY" value={formatCurrency(stats.expectancy)} />
        <KpiCard label="PROFIT FACTOR" value={stats.profitFactor.toFixed(2)} />
        <KpiCard label="AVG WIN HOLD" value={stats.avgHoldTime} />
        <KpiCard label="AVG LOSS HOLD" value={stats.avgHoldTime} />
        <KpiCard label="AVG LOSS" value={formatCurrency(stats.avgLoss)} />
        <KpiCard label="AVG WIN" value={formatCurrency(stats.avgWin)} />
      </div>

      {/* KPI Cards Grid - Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="WIN STREAK" value={stats.longestWinStreak.toString()} />
        <KpiCard label="LOSS STREAK" value={stats.longestLossStreak.toString()} />
        <KpiCard label="TOP LOSS" value={formatCurrency(stats.largestLoss)} />
        <KpiCard label="TOP WIN" value={formatCurrency(stats.largestWin)} />
        <KpiCard label="AVG DAILY VOL" value={`${(stats.totalTrades / 1).toFixed(0)}`} />
        <KpiCard label="AVG SIZE" value={`${(stats.totalTrades / 1).toFixed(0)}`} />
      </div>

      {/* Equity Curve */}
      {equityCurve.length > 1 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
            Equity Curve
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--text-muted)" }}
              />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [formatCurrency(Number(value)), "Equity"]}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance by Day of Week */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
          Performance by Day of Week
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={dayOfWeekData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis type="number" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
            <YAxis
              dataKey="day"
              type="category"
              tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value) => [formatCurrency(Number(value)), "Avg PnL"]}
            />
            <Bar dataKey="avgPnl" fill="#3b82f6">
              {dayOfWeekData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.avgPnl >= 0 ? "#10b981" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance by Hour */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
          Performance by Hour
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={hourlyData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis type="number" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
            <YAxis
              dataKey="hour"
              type="category"
              tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value) => [formatCurrency(Number(value)), "Avg PnL"]}
            />
            <Bar dataKey="avgPnl" fill="#3b82f6">
              {hourlyData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.avgPnl >= 0 ? "#10b981" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tag Performance Table */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
          Tag Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border">
                <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">
                  Tag
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Trades
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  PnL
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  PnL %
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Contribution %
                </th>
              </tr>
            </thead>
            <tbody>
              {tagPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    No trades with tags yet
                  </td>
                </tr>
              ) : (
                tagPerformance.map((tag) => (
                  <tr key={tag.tag} className="border-b border-card-border hover:bg-background/50">
                    <td className="px-4 py-3 font-medium text-accent">{tag.tag}</td>
                    <td className="px-4 py-3 text-right font-mono">{tag.trades}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-medium ${
                        tag.pnl >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {formatCurrency(tag.pnl)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-xs ${
                        tag.pnlPercent >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {formatPercent(tag.pnlPercent)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                      {formatPercent(tag.contribution)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Symbol Performance Table */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
          Symbol Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border">
                <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">
                  Symbol
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Trades
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  PnL
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  PnL %
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Contribution %
                </th>
              </tr>
            </thead>
            <tbody>
              {symbolPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    No closed trades yet
                  </td>
                </tr>
              ) : (
                symbolPerformance.map((symbol) => (
                  <tr key={symbol.symbol} className="border-b border-card-border hover:bg-background/50">
                    <td className="px-4 py-3 font-medium text-accent">{symbol.symbol}</td>
                    <td className="px-4 py-3 text-right font-mono">{symbol.trades}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-medium ${
                        symbol.pnl >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {formatCurrency(symbol.pnl)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-xs ${
                        symbol.pnlPercent >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {formatPercent(symbol.pnlPercent)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                      {formatPercent(symbol.contribution)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <div className="text-xs text-muted uppercase tracking-wide font-semibold">{label}</div>
      <div className="text-lg font-bold text-foreground mt-2 font-mono">{value}</div>
    </div>
  );
}

function getHourlyPerformance(trades: Trade[]) {
  const hourData: Record<string, { totalPnl: number; wins: number; total: number }> = {};

  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i < 10 ? `0${i}` : i.toString();
    return hour;
  });

  hours.forEach((hour) => {
    hourData[hour] = { totalPnl: 0, wins: 0, total: 0 };
  });

  trades
    .filter((t) => t.exit_date && t.pnl !== null)
    .forEach((t) => {
      const hour = new Date(t.exit_date!).getHours();
      const hourStr = hour < 10 ? `0${hour}` : hour.toString();
      hourData[hourStr].totalPnl += t.pnl!;
      hourData[hourStr].total++;
      if (t.pnl! > 0) hourData[hourStr].wins++;
    });

  return hours.map((hour) => ({
    hour: `${hour}:00`,
    avgPnl: hourData[hour].total > 0 ? hourData[hour].totalPnl / hourData[hour].total : 0,
    tradeCount: hourData[hour].total,
    winRate: hourData[hour].total > 0 ? (hourData[hour].wins / hourData[hour].total) * 100 : 0,
  }));
}

function computeTagPerformance(trades: Trade[]) {
  const closed = trades.filter((t) => t.pnl !== null);
  const totalPnl = closed.reduce((sum, t) => sum + t.pnl!, 0);

  const tagMap: Record<
    string,
    { trades: number; pnl: number; winCount: number }
  > = {};

  closed.forEach((t) => {
    if (t.strategy_tags && t.strategy_tags.length > 0) {
      t.strategy_tags.forEach((tag) => {
        if (!tagMap[tag]) {
          tagMap[tag] = { trades: 0, pnl: 0, winCount: 0 };
        }
        tagMap[tag].trades++;
        tagMap[tag].pnl += t.pnl!;
        if (t.pnl! > 0) tagMap[tag].winCount++;
      });
    }
  });

  return Object.entries(tagMap)
    .map(([tag, data]) => ({
      tag,
      trades: data.trades,
      pnl: data.pnl,
      pnlPercent:
        data.trades > 0
          ? ((data.winCount / data.trades) * 100 - (1 - data.winCount / data.trades) * 100)
          : 0,
      contribution: totalPnl !== 0 ? (data.pnl / totalPnl) * 100 : 0,
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}

function computeSymbolPerformance(trades: Trade[]) {
  const closed = trades.filter((t) => t.pnl !== null);
  const totalPnl = closed.reduce((sum, t) => sum + t.pnl!, 0);

  const symbolMap: Record<
    string,
    { trades: number; pnl: number; winCount: number }
  > = {};

  closed.forEach((t) => {
    const symbol = t.ticker;
    if (!symbolMap[symbol]) {
      symbolMap[symbol] = { trades: 0, pnl: 0, winCount: 0 };
    }
    symbolMap[symbol].trades++;
    symbolMap[symbol].pnl += t.pnl!;
    if (t.pnl! > 0) symbolMap[symbol].winCount++;
  });

  return Object.entries(symbolMap)
    .map(([symbol, data]) => ({
      symbol,
      trades: data.trades,
      pnl: data.pnl,
      pnlPercent:
        data.trades > 0
          ? ((data.winCount / data.trades) * 100 - (1 - data.winCount / data.trades) * 100)
          : 0,
      contribution: totalPnl !== 0 ? (data.pnl / totalPnl) * 100 : 0,
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}
