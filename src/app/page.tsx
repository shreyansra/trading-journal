"use client";

import { useTrades } from "@/lib/TradeContext";
import { computeStats, getEquityCurve, formatCurrency, formatDate } from "@/lib/utils";
import Dashboard from "@/components/Dashboard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function HomePage() {
  const { trades, tags, setShowTradeModal, setEditingTrade } = useTrades();
  const stats = computeStats(trades);
  const equityCurve = getEquityCurve(trades);

  return (
    <div className="space-y-6">
      {/* Mini equity chart */}
      {equityCurve.length > 1 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={equityCurve}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["auto", "auto"]} />
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

      {/* Stats bar */}
      <Dashboard stats={stats} />

      {/* Trade table */}
      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-card border-b border-card-border">
              <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">Symbol</th>
              <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">Side</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Qty</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Entry</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Exit</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Return</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Return %</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted">
                  <div className="flex flex-col items-center gap-3">
                    <svg className="w-10 h-10 text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <p className="text-sm">No trades yet. Click "New Trade" to get started.</p>
                  </div>
                </td>
              </tr>
            ) : (
              trades.map((trade) => {
                const returnPct =
                  trade.pnl !== null && trade.entry_price > 0 && trade.quantity > 0
                    ? (trade.pnl / (trade.entry_price * trade.quantity)) * 100
                    : null;

                return (
                  <tr
                    key={trade.id}
                    className="border-b border-card-border hover:bg-card/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setEditingTrade(trade);
                      setShowTradeModal(true);
                    }}
                  >
                    <td className="px-4 py-3 text-muted">{formatDate(trade.entry_date)}</td>
                    <td className="px-4 py-3 font-medium text-accent">{trade.ticker}</td>
                    <td className="px-4 py-3">
                      {trade.pnl === null ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-cyan/15 text-cyan">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
                          OPEN
                        </span>
                      ) : trade.pnl > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-green/15 text-green">
                          <span className="w-1.5 h-1.5 rounded-full bg-green" />
                          WIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-red/15 text-red">
                          <span className="w-1.5 h-1.5 rounded-full bg-red" />
                          LOSS
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <svg className={`w-4 h-4 ${trade.direction === "long" ? "text-green" : "text-red"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {trade.direction === "long" ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22" />
                        )}
                      </svg>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{trade.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(trade.entry_price)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">
                      {trade.exit_price !== null ? formatCurrency(trade.exit_price) : "-"}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${
                      trade.pnl === null ? "text-muted" : trade.pnl > 0 ? "text-green" : "text-red"
                    }`}>
                      {trade.pnl !== null ? formatCurrency(trade.pnl) : "-"}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-xs ${
                      returnPct === null ? "text-muted" : returnPct > 0 ? "text-green" : "text-red"
                    }`}>
                      {returnPct !== null ? `${returnPct.toFixed(2)}%` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTrade(trade);
                          setShowTradeModal(true);
                        }}
                        className="p-1 rounded hover:bg-background text-muted hover:text-foreground transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
