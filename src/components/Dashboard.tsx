"use client";

import { DashboardStats } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface DashboardProps {
  stats: DashboardStats;
}

export default function Dashboard({ stats }: DashboardProps) {
  const cards = [
    {
      label: "Total P&L",
      value: formatCurrency(stats.totalPnl),
      color: stats.totalPnl >= 0 ? "text-green" : "text-red",
    },
    {
      label: "Win Rate",
      value: formatPercent(stats.winRate),
      color: stats.winRate >= 50 ? "text-green" : "text-red",
    },
    { label: "Total Trades", value: stats.totalTrades.toString(), color: "text-foreground" },
    { label: "Open Trades", value: stats.openTrades.toString(), color: "text-accent" },
    {
      label: "Avg Win",
      value: formatCurrency(stats.avgWin),
      color: "text-green",
    },
    {
      label: "Avg Loss",
      value: formatCurrency(stats.avgLoss),
      color: "text-red",
    },
    {
      label: "Profit Factor",
      value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2),
      color: stats.profitFactor >= 1 ? "text-green" : "text-red",
    },
    {
      label: "Largest Win",
      value: formatCurrency(stats.largestWin),
      color: "text-green",
    },
    {
      label: "Largest Loss",
      value: formatCurrency(stats.largestLoss),
      color: "text-red",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card border border-card-border rounded-xl p-4"
        >
          <p className="text-xs text-muted mb-1">{card.label}</p>
          <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
