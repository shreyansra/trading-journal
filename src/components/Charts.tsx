"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Trade } from "@/lib/types";
import { getEquityCurve, getMonthlyPnl, formatCurrency } from "@/lib/utils";

interface ChartsProps {
  trades: Trade[];
}

export default function Charts({ trades }: ChartsProps) {
  const equityCurve = getEquityCurve(trades);
  const monthlyPnl = getMonthlyPnl(trades);
  const closedTrades = trades.filter((t) => t.pnl !== null);
  const wins = closedTrades.filter((t) => t.pnl! > 0).length;
  const losses = closedTrades.filter((t) => t.pnl! <= 0).length;

  const pieData = [
    { name: "Wins", value: wins },
    { name: "Losses", value: losses },
  ];
  const COLORS = ["#10b981", "#ef4444"];

  if (closedTrades.length === 0) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-8 text-center text-muted">
        <p>No closed trades yet. Charts will appear once you close some trades.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Equity Curve */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted mb-4">Equity Curve (Cumulative P&L)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={equityCurve}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickFormatter={(v) => `$${v}`}
            />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly P&L */}
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h3 className="text-sm font-medium text-muted mb-4">Monthly P&L</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyPnl}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [formatCurrency(Number(value)), "P&L"]}
              />
              <Bar dataKey="pnl">
                {monthlyPnl.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss Pie */}
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h3 className="text-sm font-medium text-muted mb-4">Win / Loss Ratio</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
