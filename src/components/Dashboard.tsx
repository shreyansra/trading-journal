"use client";

import { DashboardStats } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface DashboardProps {
  stats: DashboardStats;
}

export default function Dashboard({ stats }: DashboardProps) {
  const wins = stats.closedTrades > 0
    ? Math.round((stats.winRate / 100) * stats.closedTrades)
    : 0;
  const losses = stats.closedTrades - wins;

  return (
    <div className="space-y-4">
      {/* Top stats bar - matching StonkJournal's inline stats */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Wins */}
        <StatPill label="WINS" value={wins.toString()} color="text-green" />
        <MiniPill value={formatPercent(stats.winRate)} color="bg-green/15 text-green" />

        {/* Losses */}
        <StatPill label="LOSSES" value={losses.toString()} color="text-red" />
        <MiniPill
          value={formatPercent(stats.closedTrades > 0 ? 100 - stats.winRate : 0)}
          color="bg-red/15 text-red"
        />

        {/* Open */}
        <StatPill label="OPEN" value={stats.openTrades.toString()} color="text-cyan" />

        {/* Divider */}
        <div className="w-px h-8 bg-card-border hidden sm:block" />

        {/* AVG W */}
        <StatPill label="AVG W" value={formatCurrency(stats.avgWin)} color="text-green" />

        {/* AVG L */}
        <StatPill label="AVG L" value={formatCurrency(stats.avgLoss)} color="text-red" />

        {/* Divider */}
        <div className="w-px h-8 bg-card-border hidden sm:block" />

        {/* Big P&L display */}
        <div className="ml-auto text-right">
          <div className="text-xs text-muted uppercase tracking-wide">PnL</div>
          <div className={`text-2xl font-bold ${stats.totalPnl >= 0 ? "text-green" : "text-red"}`}>
            {formatCurrency(stats.totalPnl)}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

function MiniPill({ value, color }: { value: string; color: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>
      {value}
    </span>
  );
}
