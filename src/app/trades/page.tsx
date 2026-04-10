"use client";

import { useState, useMemo } from "react";
import { useTrades } from "@/lib/TradeContext";
import { Trade, TradeFilters } from "@/lib/types";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type SortKey = "entry_date" | "ticker" | "direction" | "pnl" | "duration" | "percent_return";
type SortDir = "asc" | "desc";
type TabType = "closed" | "open";

const CSV = require("papaparse");

export default function TradesPage() {
  const { trades, tags, refresh } = useTrades();

  // Local state
  const [activeTab, setActiveTab] = useState<TabType>("closed");
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<"all" | "long" | "short">("all");
  const [sortKey, setSortKey] = useState<SortKey>("entry_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingData, setEditingData] = useState<Partial<Trade> | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Filter trades based on tab and criteria
  const filtered = useMemo(() => {
    let result = [...trades];

    // Filter by tab (open/closed)
    if (activeTab === "open") {
      result = result.filter((t) => t.pnl === null);
    } else {
      result = result.filter((t) => t.pnl !== null);
    }

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticker.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q)
      );
    }

    // Filter by direction
    if (direction !== "all") {
      result = result.filter((t) => t.direction === direction);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "entry_date":
          cmp = new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime();
          break;
        case "ticker":
          cmp = a.ticker.localeCompare(b.ticker);
          break;
        case "direction":
          cmp = a.direction.localeCompare(b.direction);
          break;
        case "pnl":
          cmp = (a.pnl ?? 0) - (b.pnl ?? 0);
          break;
        case "percent_return":
          cmp = calculatePercentReturn(a) - calculatePercentReturn(b);
          break;
        case "duration":
          cmp = calculateDuration(a) - calculateDuration(b);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [trades, activeTab, search, direction, sortKey, sortDir]);

  // Helper: Calculate percent return
  function calculatePercentReturn(trade: Trade): number {
    if (!trade.exit_price) return 0;
    const priceDiff = trade.direction === "long"
      ? trade.exit_price - trade.entry_price
      : trade.entry_price - trade.exit_price;
    return (priceDiff / trade.entry_price) * 100;
  }

  // Helper: Calculate hold duration in hours
  function calculateDuration(trade: Trade): number {
    if (!trade.exit_date) return 0;
    const ms = new Date(trade.exit_date).getTime() - new Date(trade.entry_date).getTime();
    return ms / (1000 * 60 * 60);
  }

  // Helper: Format duration display
  function formatDuration(hours: number): string {
    if (hours === 0) return "-";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // Export CSV
  function exportCSV(mode: "all" | "closed" | "open") {
    const dataToExport =
      mode === "all"
        ? trades
        : mode === "closed"
          ? filtered.filter((t) => t.pnl !== null)
          : filtered.filter((t) => t.pnl === null);

    const csvData = dataToExport.map((t) => ({
      Date: t.entry_date,
      Symbol: t.ticker,
      Direction: t.direction.toUpperCase(),
      Quantity: t.quantity,
      EntryPrice: t.entry_price,
      ExitPrice: t.exit_price ?? "",
      Commission: t.fees,
      PnL: t.pnl ?? "",
      PercentReturn: t.pnl ? calculatePercentReturn(t).toFixed(2) + "%" : "",
      Duration: formatDuration(calculateDuration(t)),
      Tags: t.strategy_tags.join(";"),
      Notes: t.notes,
    }));

    const csv = CSV.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `trades-${mode}-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  }

  // Save trade changes
  async function handleSaveTrade() {
    if (!selectedTrade || !editingData) return;

    setSaveLoading(true);
    try {
      const updateData = { ...editingData };
      await supabase.from("trades").update(updateData).eq("id", selectedTrade.id);
      await refresh();
      setSelectedTrade(null);
      setEditingData(null);
    } catch (error) {
      console.error("Failed to save trade:", error);
    } finally {
      setSaveLoading(false);
    }
  }

  // Open side panel
  function openTradePanel(trade: Trade) {
    setSelectedTrade(trade);
    setEditingData({ ...trade });
  }

  // Close side panel
  function closePanel() {
    setSelectedTrade(null);
    setEditingData(null);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header with tabs and search */}
      <div className="flex-shrink-0 border-b border-card-border bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Tab buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setActiveTab("closed");
                  setSelectedTrade(null);
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "closed"
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Closed Trades
              </button>
              <button
                onClick={() => {
                  setActiveTab("open");
                  setSelectedTrade(null);
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "open"
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Open Positions
              </button>
            </div>

            {/* Search bar in middle */}
            <div className="flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search ticker, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Export and Create buttons */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-3 py-2 text-sm font-medium bg-background border border-card-border text-muted hover:text-foreground rounded-lg transition-colors"
                >
                  Export CSV
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-card border border-card-border rounded-lg shadow-lg z-10 w-40">
                    <button
                      onClick={() => exportCSV("all")}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-background/50 first:rounded-t-lg"
                    >
                      All Results
                    </button>
                    <button
                      onClick={() => exportCSV("closed")}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-background/50"
                    >
                      Closed Only
                    </button>
                    <button
                      onClick={() => exportCSV("open")}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-background/50 last:rounded-b-lg"
                    >
                      Open Only
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2">
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
              className="px-3 py-1.5 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">All Directions</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table container */}
      <div className="flex-1 overflow-auto">
        <div className="inline-block w-full min-w-full">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-card/80 backdrop-blur-sm border-b border-card-border">
              <tr>
                <th
                  className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("entry_date")}
                >
                  Date{sortIcon("entry_date")}
                </th>
                <th
                  className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("ticker")}
                >
                  Symbol{sortIcon("ticker")}
                </th>
                <th
                  className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("direction")}
                >
                  Direction{sortIcon("direction")}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Qty
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Entry
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Exit
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">
                  Comm
                </th>
                <th
                  className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("pnl")}
                >
                  P&L{sortIcon("pnl")}
                </th>
                <th
                  className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("percent_return")}
                >
                  % Return{sortIcon("percent_return")}
                </th>
                <th
                  className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("duration")}
                >
                  Duration{sortIcon("duration")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">
                  Tags
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted">
                    No trades found
                  </td>
                </tr>
              ) : (
                filtered.map((trade, idx) => {
                  const percentReturn = calculatePercentReturn(trade);
                  const duration = calculateDuration(trade);
                  return (
                    <tr
                      key={trade.id}
                      className={`border-b border-card-border cursor-pointer transition-colors ${
                        idx % 2 === 0 ? "bg-background/30" : "bg-background/50"
                      } hover:bg-card/20`}
                      onClick={() => openTradePanel(trade)}
                    >
                      <td className="px-4 py-3 text-muted font-mono">
                        {formatDate(trade.entry_date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-accent">
                        {trade.ticker}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium ${
                            trade.direction === "long"
                              ? "text-green"
                              : "text-red"
                          }`}
                        >
                          {trade.direction === "long" ? "LONG" : "SHORT"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted">
                        {trade.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {formatCurrency(trade.entry_price)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted">
                        {trade.exit_price !== null
                          ? formatCurrency(trade.exit_price)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted text-xs">
                        {formatCurrency(trade.fees)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-medium ${
                          trade.pnl === null
                            ? "text-muted"
                            : trade.pnl > 0
                              ? "text-green"
                              : "text-red"
                        }`}
                      >
                        {trade.pnl !== null ? formatCurrency(trade.pnl) : "-"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-medium ${
                          percentReturn === 0
                            ? "text-muted"
                            : percentReturn > 0
                              ? "text-green"
                              : "text-red"
                        }`}
                      >
                        {percentReturn !== 0
                          ? formatPercent(percentReturn)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted text-xs">
                        {formatDuration(duration)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {trade.strategy_tags.map((tagName) => {
                            const tagObj = tags.find((t) => t.name === tagName);
                            return (
                              <span
                                key={tagName}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                                style={{
                                  backgroundColor: tagObj?.color || "#666",
                                }}
                              >
                                {tagName}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-card-border bg-card/50 px-6 py-3">
        <p className="text-xs text-muted">
          {filtered.length} of {trades.length} trades
        </p>
      </div>

      {/* Trade Detail Side Panel */}
      {selectedTrade && editingData && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="slide-panel fixed right-0 top-0 h-screen w-96 bg-card border-l border-card-border flex flex-col z-50">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-card-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Trade Details</h2>
              <button
                onClick={closePanel}
                className="p-1 rounded hover:bg-background text-muted hover:text-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Date fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-2">
                    Entry Date
                  </label>
                  <input
                    type="date"
                    value={editingData.entry_date || ""}
                    onChange={(e) =>
                      setEditingData({
                        ...editingData,
                        entry_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                {activeTab === "closed" && (
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-2">
                      Exit Date
                    </label>
                    <input
                      type="date"
                      value={editingData.exit_date || ""}
                      onChange={(e) =>
                        setEditingData({
                          ...editingData,
                          exit_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                )}
              </div>

              {/* Price fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-2">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingData.entry_price || ""}
                    onChange={(e) =>
                      setEditingData({
                        ...editingData,
                        entry_price: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                {activeTab === "closed" && (
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-2">
                      Exit Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingData.exit_price || ""}
                      onChange={(e) =>
                        setEditingData({
                          ...editingData,
                          exit_price: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                )}
              </div>

              {/* Quantity & Fees */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={editingData.quantity || ""}
                    onChange={(e) =>
                      setEditingData({
                        ...editingData,
                        quantity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-2">
                    Commissions/Fees
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingData.fees || ""}
                    onChange={(e) =>
                      setEditingData({
                        ...editingData,
                        fees: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* P&L Display */}
              {editingData.pnl != null && (
                <div
                  className={`p-4 rounded-lg border ${
                    (editingData.pnl ?? 0) > 0
                      ? "bg-green/10 border-green/30 text-green"
                      : "bg-red/10 border-red/30 text-red"
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide font-medium mb-1">
                    P&L
                  </p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(editingData.pnl ?? 0)}
                  </p>
                </div>
              )}

              {/* Strategy Tag */}
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-2">
                  Strategy Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        const current = editingData.strategy_tags || [];
                        const updated = current.includes(tag.name)
                          ? current.filter((t) => t !== tag.name)
                          : [...current, tag.name];
                        setEditingData({
                          ...editingData,
                          strategy_tags: updated,
                        });
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                        (editingData.strategy_tags || []).includes(tag.name)
                          ? "text-white border-transparent"
                          : "border-card-border text-muted hover:text-foreground"
                      }`}
                      style={
                        (editingData.strategy_tags || []).includes(tag.name)
                          ? { backgroundColor: tag.color }
                          : undefined
                      }
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-2">
                  Notes
                </label>
                <textarea
                  value={editingData.notes || ""}
                  onChange={(e) =>
                    setEditingData({
                      ...editingData,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none h-24"
                  placeholder="Add trade notes..."
                />
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex-shrink-0 border-t border-card-border px-6 py-4 flex gap-2">
              <button
                onClick={closePanel}
                className="flex-1 px-4 py-2 bg-background border border-card-border text-foreground rounded-lg hover:bg-background/80 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTrade}
                disabled={saveLoading}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {saveLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
