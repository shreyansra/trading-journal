"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTrades } from "@/lib/TradeContext";
import { Trade } from "@/lib/types";
import {
  computeStats,
  fmtCurrency,
  fmtPct,
  fmtDate,
  fmtDateShort,
  calendarData,
  topSymbols,
  returnPct,
} from "@/lib/utils";

/* ── Helpers ─────────────────────────────────────────────── */

function WinRateGauge({ rate }: { rate: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(rate, 100);
  const dashWin = (pct / 100) * circ;
  const dashLoss = circ - dashWin;
  const color = rate >= 50 ? "var(--color-profit)" : "var(--color-loss)";

  return (
    <svg viewBox="0 0 80 80" className="w-[72px] h-[72px]">
      {/* background ring */}
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
      {/* value arc */}
      <circle
        cx="40" cy="40" r={r}
        fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dashWin} ${dashLoss}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text x="40" y="38" textAnchor="middle" fill="var(--color-text)" fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">
        {rate.toFixed(0)}%
      </text>
      <text x="40" y="51" textAnchor="middle" fill="var(--color-text-dim)" fontSize="8">
        Win Rate
      </text>
    </svg>
  );
}

function StreakRing({
  value,
  max,
  label,
  dateRange,
  color,
}: {
  value: number;
  max: number;
  label: string;
  dateRange: string;
  color: string;
}) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = pct * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg viewBox="0 0 72 72" className="w-[68px] h-[68px]">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-border)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={r}
          fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <text x="36" y="40" textAnchor="middle" fill="var(--color-text)" fontSize="16" fontWeight="700" fontFamily="var(--font-mono)">
          {value}
        </text>
      </svg>
      <span className="text-[11px] font-semibold text-text-dim uppercase tracking-wider">{label}</span>
      <span className="text-[10px] text-text-dim">{dateRange}</span>
    </div>
  );
}

/* ── Mini stat pill used in top bar ──────────────────────── */
function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5">
      <span className="text-[10px] text-text-dim uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold font-mono ${color ?? "text-text"}`}>{value}</span>
    </div>
  );
}

/* ── Calendar Heatmap ────────────────────────────────────── */
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function CalendarHeatmap({ trades }: { trades: Trade[] }) {
  const year = new Date().getFullYear();
  const days = useMemo(() => calendarData(trades), [trades]);
  const dayMap = useMemo(() => {
    const m: Record<string, number> = {};
    days.forEach((d) => { m[d.date] = d.pnl; });
    return m;
  }, [days]);

  // Build weeks grid per month
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, mi) => {
      const first = new Date(year, mi, 1);
      const lastDay = new Date(year, mi + 1, 0).getDate();
      const startDow = first.getDay(); // 0=Sun
      const cells: { day: number | null; date: string; pnl: number | null }[] = [];

      // pad start
      for (let i = 0; i < startDow; i++) cells.push({ day: null, date: "", pnl: null });
      for (let d = 1; d <= lastDay; d++) {
        const ds = `${year}-${String(mi + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        cells.push({ day: d, date: ds, pnl: dayMap[ds] ?? null });
      }
      return cells;
    });
  }, [year, dayMap]);

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Calendar Heatmap</h3>
        <span className="text-xs text-text-dim font-mono">{year}</span>
      </div>
      <div className="grid grid-cols-12 gap-x-1 min-w-[700px]">
        {months.map((cells, mi) => (
          <div key={mi} className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-text-dim mb-1 tracking-wider">{MONTHS[mi]}</span>
            <div className="grid grid-cols-7 gap-[2px]">
              {cells.map((c, ci) => {
                if (c.day === null) return <div key={ci} className="w-[10px] h-[10px]" />;
                let bg = "bg-border/40";
                if (c.pnl !== null) {
                  bg = c.pnl > 0 ? "bg-profit" : "bg-loss";
                }
                return (
                  <div
                    key={ci}
                    className={`w-[10px] h-[10px] rounded-[2px] ${bg} ${c.pnl !== null ? "opacity-80 hover:opacity-100" : ""}`}
                    title={c.pnl !== null ? `${c.date}: ${fmtCurrency(c.pnl)}` : c.date}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Recent Trades Table ─────────────────────────────────── */
function RecentTrades({ trades, onEdit }: { trades: Trade[]; onEdit: (t: Trade) => void }) {
  const [tab, setTab] = useState<"recent" | "open">("recent");

  const filtered = useMemo(() => {
    if (tab === "open") return trades.filter((t) => t.pnl == null).slice(0, 15);
    return trades.filter((t) => t.pnl != null).slice(0, 15);
  }, [trades, tab]);

  return (
    <div className="bg-bg-card border border-border rounded-xl">
      <div className="flex items-center gap-4 px-4 pt-3 pb-2 border-b border-border">
        <h3 className="text-sm font-semibold mr-auto">Recent Trades</h3>
        {(["recent", "open"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${
              tab === t ? "bg-accent/15 text-accent" : "text-text-dim hover:text-text"
            }`}
          >
            {t === "recent" ? "Recent" : "Open"}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-dim uppercase tracking-wider text-[10px]">
              <th className="text-left px-4 py-2 font-semibold">Symbol</th>
              <th className="text-left px-3 py-2 font-semibold">Direction</th>
              <th className="text-right px-3 py-2 font-semibold">Entry</th>
              <th className="text-right px-3 py-2 font-semibold">Exit</th>
              <th className="text-right px-3 py-2 font-semibold">Qty</th>
              <th className="text-right px-3 py-2 font-semibold">P&L</th>
              <th className="text-right px-3 py-2 font-semibold">Return</th>
              <th className="text-right px-4 py-2 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-text-dim">No trades yet</td></tr>
            )}
            {filtered.map((t) => {
              const ret = returnPct(t);
              return (
                <tr
                  key={t.id}
                  onClick={() => onEdit(t)}
                  className="border-t border-border/50 hover:bg-bg-card-hover cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5 font-semibold font-mono">{t.ticker}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      t.direction === "long" ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss"
                    }`}>
                      {t.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">${t.entry_price.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{t.exit_price != null ? `$${t.exit_price.toFixed(2)}` : "-"}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{t.quantity}</td>
                  <td className={`px-3 py-2.5 text-right font-mono font-semibold ${
                    t.pnl == null ? "text-text-dim" : t.pnl >= 0 ? "text-profit" : "text-loss"
                  }`}>
                    {t.pnl != null ? fmtCurrency(t.pnl) : "-"}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono ${
                    ret == null ? "text-text-dim" : ret >= 0 ? "text-profit" : "text-loss"
                  }`}>
                    {ret != null ? fmtPct(ret) : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-text-dim">{fmtDateShort(t.entry_date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Dashboard Page ──────────────────────────────────────── */
export default function DashboardPage() {
  const { trades, setShowModal, setEditingTrade } = useTrades();
  const stats = useMemo(() => computeStats(trades), [trades]);
  const symbols = useMemo(() => topSymbols(trades, 6), [trades]);

  const maxSymPnl = useMemo(() => {
    if (symbols.length === 0) return 1;
    return Math.max(...symbols.map((s) => Math.abs(s.pnl)));
  }, [symbols]);

  function openEdit(t: Trade) {
    setEditingTrade(t);
    setShowModal(true);
  }

  return (
    <div className="space-y-4 anim-slide-up">
      {/* Welcome bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-dim">Welcome back! Here&apos;s your trading overview.</p>
      </div>

      {/* ── Mini stats row ── */}
      <div className="flex flex-wrap items-center gap-1 bg-bg-card border border-border rounded-xl px-2 py-1 overflow-x-auto">
        <MiniStat label="Total Trades" value={stats.closedTrades.toString()} />
        <div className="w-px h-6 bg-border" />
        <MiniStat label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} color={stats.winRate >= 50 ? "text-profit" : "text-loss"} />
        <div className="w-px h-6 bg-border" />
        <MiniStat label="Profit Factor" value={stats.profitFactor === Infinity ? "INF" : stats.profitFactor.toFixed(2)} color={stats.profitFactor >= 1 ? "text-profit" : "text-loss"} />
        <div className="w-px h-6 bg-border" />
        <MiniStat label="Avg Win" value={fmtCurrency(stats.avgWin)} color="text-profit" />
        <div className="w-px h-6 bg-border" />
        <MiniStat label="Avg Loss" value={fmtCurrency(stats.avgLoss)} color="text-loss" />
        <div className="w-px h-6 bg-border" />
        <MiniStat label="Expectancy" value={fmtCurrency(stats.expectancy)} color={stats.expectancy >= 0 ? "text-profit" : "text-loss"} />
      </div>

      {/* ── Main 3-column row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Account Summary */}
        <div className="bg-bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Account Summary</h3>
            <WinRateGauge rate={stats.winRate} />
          </div>
          <div className={`text-2xl font-bold font-mono ${stats.totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
            {fmtCurrency(stats.totalPnl)}
          </div>
          <div className={`text-xs font-mono ${stats.totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
            {stats.totalPnl >= 0 ? "+" : ""}{fmtCurrency(stats.totalPnl)}
          </div>
          <div className="space-y-2 mt-1">
            {[
              { label: "Total Deposits", value: fmtCurrency(stats.totalDeposits), cls: "" },
              { label: "Realized P/L", value: fmtCurrency(stats.totalPnl), cls: stats.totalPnl >= 0 ? "text-profit" : "text-loss" },
              { label: "Open Positions", value: stats.openTrades.toString(), cls: "" },
              { label: "Total Withdrawals", value: fmtCurrency(0), cls: "" },
              { label: "Total Commissions", value: fmtCurrency(stats.totalCommissions), cls: stats.totalCommissions > 0 ? "text-loss" : "" },
              { label: "Total Fees", value: fmtCurrency(stats.totalCommissions), cls: "" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className="text-text-dim">{row.label}</span>
                <span className={`font-mono font-medium ${row.cls}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Performance Metrics</h3>
          <div className="space-y-2.5">
            {[
              { label: "Best Trade", value: fmtCurrency(stats.bestTrade), cls: "text-profit" },
              { label: "Worst Trade", value: fmtCurrency(stats.worstTrade), cls: "text-loss" },
              { label: "Consecutive Wins", value: stats.longestWinStreak.toString(), cls: "text-profit" },
              { label: "Consecutive Losses", value: stats.longestLoseStreak.toString(), cls: "text-loss" },
              { label: "Avg. Time in Trade", value: stats.avgHoldTime, cls: "" },
              { label: "Long Performance", value: fmtCurrency(stats.longPnl), cls: stats.longPnl >= 0 ? "text-profit" : "text-loss" },
              { label: "Short Performance", value: fmtCurrency(stats.shortPnl), cls: stats.shortPnl >= 0 ? "text-profit" : "text-loss" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className="text-text-dim">{row.label}</span>
                <span className={`font-mono font-semibold ${row.cls}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Symbols */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Top Performing Symbols</h3>
          {symbols.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-dim text-xs">No data</div>
          ) : (
            <div className="space-y-2">
              {symbols.map((s) => {
                const pct = (Math.abs(s.pnl) / maxSymPnl) * 100;
                const isProfit = s.pnl >= 0;
                return (
                  <div key={s.sym} className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold w-12 shrink-0">{s.sym}</span>
                    <div className="flex-1 h-5 bg-border/30 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all duration-500 ${isProfit ? "bg-profit" : "bg-loss"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono font-semibold w-20 text-right ${isProfit ? "text-profit" : "text-loss"}`}>
                      {fmtCurrency(s.pnl)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Performance Streaks ── */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Performance Streaks</h3>
          <p className="text-[10px] text-text-dim mt-0.5">Visualize your P&L for the entire year</p>
        </div>
        <div className="flex flex-wrap items-start justify-around gap-6">
          <StreakRing
            value={stats.longestWinStreak}
            max={Math.max(stats.longestWinStreak, stats.longestLoseStreak, 1)}
            label="Longest Win Streak"
            dateRange={`${stats.longestWinStreak} days`}
            color="var(--color-profit)"
          />
          <StreakRing
            value={stats.longestLoseStreak}
            max={Math.max(stats.longestWinStreak, stats.longestLoseStreak, 1)}
            label="Longest Lose Streak"
            dateRange={`${stats.longestLoseStreak} days`}
            color="var(--color-loss)"
          />
          <StreakRing
            value={stats.currentStreak.count}
            max={Math.max(stats.longestWinStreak, stats.longestLoseStreak, 1)}
            label="Current Streak"
            dateRange={`${stats.currentStreak.count} days`}
            color={stats.currentStreak.type === "win" ? "var(--color-profit)" : stats.currentStreak.type === "loss" ? "var(--color-loss)" : "var(--color-border)"}
          />
        </div>
      </div>

      {/* ── Calendar Heatmap ── */}
      <CalendarHeatmap trades={trades} />

      {/* ── Recent Trades ── */}
      <RecentTrades trades={trades} onEdit={openEdit} />
    </div>
  );
}
