"use client";

import { useState, useMemo } from "react";
import { useTrades } from "@/lib/TradeContext";
import {
  computeStats,
  getEquityCurve,
  getDayOfWeekData,
  formatCurrency,
  formatDate,
  formatPercent,
  getMonthlyPnl,
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
  ComposedChart,
  Legend,
} from "recharts";

type TabType = "overview" | "pnl" | "strategy" | "symbol";

export default function StatsPage() {
  const { trades } = useTrades();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const stats = useMemo(() => computeStats(trades), [trades]);
  const equityCurve = useMemo(() => getEquityCurve(trades), [trades]);
  const dailyPnlData = useMemo(() => getDailyPnlData(trades), [trades]);
  const weeklyPnlData = useMemo(() => getWeeklyPnlData(trades), [trades]);
  const monthlyPnlData = useMemo(() => getMonthlyPnl(trades), [trades]);
  const cumulativePnlData = useMemo(() => getCumulativePnlData(trades), [trades]);
  const strategyData = useMemo(() => getStrategyPerformance(trades), [trades]);
  const symbolData = useMemo(() => getSymbolPerformance(trades), [trades]);

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-card-border">
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "pnl", label: "PnL Analysis" },
            { id: "strategy", label: "Strategy Analysis" },
            { id: "symbol", label: "Symbol Analysis" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Equity Curve */}
          {equityCurve.length > 1 && (
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                Equity Curve
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), "Equity"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Performance & Trade Metrics */}
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                Performance & Trade Metrics
              </h3>
              <div className="space-y-3">
                <StatRow label="Total PnL" value={formatCurrency(stats.totalPnl)} />
                <StatRow label="Best Month" value="TBD" />
                <StatRow label="Avg Trade PnL" value={formatCurrency(stats.totalPnl / Math.max(stats.closedTrades, 1))} />
                <StatRow label="Worst Month" value="TBD" />
                <StatRow label="Best Day" value="TBD" />
                <StatRow label="Avg Daily PnL" value="TBD" />
                <StatRow label="Total Trades" value={stats.totalTrades.toString()} />
                <StatRow label="Winning Trades" value={stats.totalPnl > 0 ? `${Math.round((stats.totalPnl / Math.abs(stats.totalPnl)) * 100)}%` : "0"} />
                <StatRow label="Break Even Trades" value="TBD" />
                <StatRow label="Losing Trades" value={stats.totalTrades - Math.ceil(stats.closedTrades * (stats.winRate / 100))} />
                <StatRow label="Largest Profit" value={formatCurrency(stats.largestWin)} />
                <StatRow label="Largest Loss" value={formatCurrency(stats.largestLoss)} />
                <StatRow label="Profit Factor" value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "N/A"} />
                <StatRow label="Avg Winning Trade" value={formatCurrency(stats.avgWin)} />
                <StatRow label="Avg Losing Trade" value={formatCurrency(-stats.avgLoss)} />
              </div>
            </div>

            {/* Right Column - Trading Patterns & Activity */}
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                Trading Patterns & Activity
              </h3>
              <div className="space-y-3">
                <StatRow label="Max Consecutive Wins" value={stats.longestWinStreak.toString()} />
                <StatRow label="Max Consecutive Losses" value={stats.longestLossStreak.toString()} />
                <StatRow label="Winning Days" value="TBD" />
                <StatRow label="Losing Days" value="TBD" />
                <StatRow label="Break Even Days" value="TBD" />
                <StatRow label="Largest Losing Day" value="TBD" />
                <StatRow label="Open Trades" value={stats.openTrades.toString()} />
                <StatRow label="Avg Trade Duration" value={stats.avgHoldTime} />
                <StatRow label="Avg Hold Time (Losing)" value={stats.avgHoldTime} />
                <StatRow label="Avg Hold Time (Winning)" value={stats.avgHoldTime} />
                <StatRow label="Total Commissions" value="TBD" />
                <StatRow label="Avg Payout % Multiple" value={stats.avgRiskReward.toFixed(2)} />
                <StatRow label="Current Streak" value={`${stats.currentStreak.count} ${stats.currentStreak.type}`} />
                <StatRow label="Win Rate" value={formatPercent(stats.winRate)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PnL Analysis Tab */}
      {activeTab === "pnl" && (
        <div className="space-y-6">
          {/* Daily PnL */}
          {dailyPnlData.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                Daily PnL
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={dailyPnlData}
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), "PnL"]}
                  />
                  <Bar dataKey="pnl" fill="var(--accent)">
                    {dailyPnlData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.pnl >= 0 ? "var(--green)" : "var(--red)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Weekly PnL */}
          {weeklyPnlData.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                Weekly PnL
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={weeklyPnlData}
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), "PnL"]}
                  />
                  <Bar dataKey="wins" stackId="a" fill="var(--green)" />
                  <Bar dataKey="losses" stackId="a" fill="var(--red)" />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="var(--orange)"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly PnL */}
          {monthlyPnlData.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                Monthly PnL
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={monthlyPnlData}
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), "PnL"]}
                  />
                  <Bar dataKey="pnl" fill="var(--orange)">
                    {monthlyPnlData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.pnl >= 0 ? "var(--orange)" : "var(--red)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cumulative PnL */}
          {cumulativePnlData.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                Cumulative PnL
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cumulativePnlData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), "Cumulative PnL"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativePnl"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Strategy Analysis Tab */}
      {activeTab === "strategy" && (
        <div className="space-y-6">
          {strategyData.length > 0 ? (
            <>
              {/* Strategy PnL vs Trades Chart */}
              <div className="bg-card border border-card-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                  Strategy Performance
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart
                    data={strategyData}
                    margin={{ top: 5, right: 30, left: 60, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                    <XAxis
                      dataKey="strategy"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      label={{ value: "PnL ($)", angle: -90, position: "insideLeft" }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      label={{ value: "# Trades", angle: 90, position: "insideRight" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="pnl" fill="var(--accent)" name="PnL">
                      {strategyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.pnl >= 0 ? "var(--green)" : "var(--red)"}
                        />
                      ))}
                    </Bar>
                    <Bar yAxisId="right" dataKey="trades" fill="var(--purple)" name="Trades" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Strategy Table */}
              <div className="bg-card border border-card-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                  Strategy Stats
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-card-border">
                        <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">
                          Strategy
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                          Trades
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                          PnL
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                          Win Rate
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                          Avg PnL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategyData.map((row) => (
                        <tr key={row.strategy} className="border-b border-card-border hover:bg-background/50">
                          <td className="px-4 py-3 font-medium text-accent">{row.strategy}</td>
                          <td className="px-4 py-3 text-right font-mono">{row.trades}</td>
                          <td
                            className={`px-4 py-3 text-right font-mono font-medium ${
                              row.pnl >= 0 ? "text-green" : "text-red"
                            }`}
                          >
                            {formatCurrency(row.pnl)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                            {formatPercent(row.winRate)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs">
                            {formatCurrency(row.pnl / row.trades)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-card border border-card-border rounded-xl p-8 text-center">
              <p className="text-muted">No strategy data available. Add tags to your trades.</p>
            </div>
          )}
        </div>
      )}

      {/* Symbol Analysis Tab */}
      {activeTab === "symbol" && (
        <div className="space-y-6">
          {symbolData.length > 0 ? (
            <>
              {/* Symbol PnL vs Trades Chart */}
              <div className="bg-card border border-card-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                  Symbol Performance
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart
                    data={symbolData}
                    margin={{ top: 5, right: 30, left: 60, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                    <XAxis
                      dataKey="symbol"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      label={{ value: "PnL ($)", angle: -90, position: "insideLeft" }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      label={{ value: "# Trades", angle: 90, position: "insideRight" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="pnl" fill="var(--accent)" name="PnL">
                      {symbolData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.pnl >= 0 ? "var(--green)" : "var(--red)"}
                        />
                      ))}
                    </Bar>
                    <Bar yAxisId="right" dataKey="tradeCount" fill="var(--purple)" name="Trades" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Symbol Table */}
              <div className="bg-card border border-card-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                  Symbol Stats
                </h3>
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
                          Win Rate
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                          Avg PnL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {symbolData.map((row) => (
                        <tr key={row.symbol} className="border-b border-card-border hover:bg-background/50">
                          <td className="px-4 py-3 font-medium text-accent">{row.symbol}</td>
                          <td className="px-4 py-3 text-right font-mono">{row.tradeCount}</td>
                          <td
                            className={`px-4 py-3 text-right font-mono font-medium ${
                              row.pnl >= 0 ? "text-green" : "text-red"
                            }`}
                          >
                            {formatCurrency(row.pnl)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                            {formatPercent(row.winRate)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs">
                            {formatCurrency(row.pnl / row.tradeCount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-card border border-card-border rounded-xl p-8 text-center">
              <p className="text-muted">No trade data available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      <span className="font-mono font-medium text-foreground text-sm">{value}</span>
    </div>
  );
}

function getDailyPnlData(trades: Trade[]): { date: string; pnl: number }[] {
  const closed = trades.filter((t) => t.exit_date && t.pnl !== null);
  const dailyMap: Record<string, number> = {};

  closed.forEach((t) => {
    const date = t.exit_date!.slice(0, 10);
    dailyMap[date] = (dailyMap[date] || 0) + t.pnl!;
  });

  return Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({ date, pnl }));
}

function getWeeklyPnlData(
  trades: Trade[]
): { week: string; wins: number; losses: number; net: number }[] {
  const closed = trades.filter((t) => t.exit_date && t.pnl !== null);
  const weeklyMap: Record<string, { wins: number; losses: number }> = {};

  closed.forEach((t) => {
    const date = new Date(t.exit_date!);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().slice(0, 10);

    if (!weeklyMap[weekKey]) weeklyMap[weekKey] = { wins: 0, losses: 0 };

    if (t.pnl! > 0) {
      weeklyMap[weekKey].wins += t.pnl!;
    } else {
      weeklyMap[weekKey].losses += t.pnl!;
    }
  });

  return Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({
      week: `Week of ${week}`,
      wins: data.wins,
      losses: Math.abs(data.losses),
      net: data.wins + data.losses,
    }));
}

function getCumulativePnlData(trades: Trade[]): { date: string; cumulativePnl: number }[] {
  const closed = trades
    .filter((t) => t.exit_date && t.pnl !== null)
    .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime());

  let cumulative = 0;
  return closed.map((t) => {
    cumulative += t.pnl!;
    return { date: t.exit_date!, cumulativePnl: cumulative };
  });
}

function getStrategyPerformance(
  trades: Trade[]
): { strategy: string; pnl: number; trades: number; winRate: number }[] {
  const closed = trades.filter((t) => t.pnl !== null);
  const strategyMap: Record<
    string,
    { pnl: number; trades: number; wins: number }
  > = {};

  closed.forEach((t) => {
    if (t.strategy_tags && t.strategy_tags.length > 0) {
      t.strategy_tags.forEach((tag) => {
        if (!strategyMap[tag]) {
          strategyMap[tag] = { pnl: 0, trades: 0, wins: 0 };
        }
        strategyMap[tag].pnl += t.pnl!;
        strategyMap[tag].trades++;
        if (t.pnl! > 0) strategyMap[tag].wins++;
      });
    }
  });

  return Object.entries(strategyMap)
    .map(([strategy, data]) => ({
      strategy,
      pnl: data.pnl,
      trades: data.trades,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}

function getSymbolPerformance(
  trades: Trade[]
): { symbol: string; pnl: number; tradeCount: number; winRate: number }[] {
  const closed = trades.filter((t) => t.pnl !== null);
  const symbolMap: Record<string, { pnl: number; tradeCount: number; wins: number }> = {};

  closed.forEach((t) => {
    const symbol = t.ticker;
    if (!symbolMap[symbol]) {
      symbolMap[symbol] = { pnl: 0, tradeCount: 0, wins: 0 };
    }
    symbolMap[symbol].pnl += t.pnl!;
    symbolMap[symbol].tradeCount++;
    if (t.pnl! > 0) symbolMap[symbol].wins++;
  });

  return Object.entries(symbolMap)
    .map(([symbol, data]) => ({
      symbol,
      pnl: data.pnl,
      tradeCount: data.tradeCount,
      winRate: data.tradeCount > 0 ? (data.wins / data.tradeCount) * 100 : 0,
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}
