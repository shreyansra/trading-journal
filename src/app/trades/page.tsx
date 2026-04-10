"use client";

import { useState, useMemo } from "react";
import { useTrades } from "@/lib/TradeContext";
import { TradeFilters } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import TagManager from "@/components/TagManager";
import IBKRImport from "@/components/IBKRImport";

type SortKey = "entry_date" | "ticker" | "pnl" | "direction";
type SortDir = "asc" | "desc";

export default function TradesPage() {
  const { trades, tags, setShowTradeModal, setEditingTrade } = useTrades();

  const [filters, setFilters] = useState<TradeFilters>({
    search: "",
    direction: "all",
    result: "all",
    tags: [],
    dateFrom: "",
    dateTo: "",
  });
  const [sortKey, setSortKey] = useState<SortKey>("entry_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showImport, setShowImport] = useState(false);

  const filtered = useMemo(() => {
    let result = [...trades];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticker.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q)
      );
    }
    if (filters.direction !== "all") {
      result = result.filter((t) => t.direction === filters.direction);
    }
    if (filters.result === "win") {
      result = result.filter((t) => t.pnl !== null && t.pnl > 0);
    } else if (filters.result === "loss") {
      result = result.filter((t) => t.pnl !== null && t.pnl <= 0);
    } else if (filters.result === "open") {
      result = result.filter((t) => t.pnl === null);
    }
    if (filters.tags.length > 0) {
      result = result.filter((t) =>
        filters.tags.some((tag) => t.strategy_tags.includes(tag))
      );
    }
    if (filters.dateFrom) {
      result = result.filter((t) => t.entry_date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      result = result.filter((t) => t.entry_date <= filters.dateTo);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "entry_date":
          cmp = new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime();
          break;
        case "ticker":
          cmp = a.ticker.localeCompare(b.ticker);
          break;
        case "pnl":
          cmp = (a.pnl ?? 0) - (b.pnl ?? 0);
          break;
        case "direction":
          cmp = a.direction.localeCompare(b.direction);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [trades, filters, sortKey, sortDir]);

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

  const inputClass =
    "px-3 py-1.5 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Trades</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-3 py-1.5 bg-background border border-card-border text-sm text-muted hover:text-foreground rounded-lg transition-colors"
          >
            {showImport ? "Hide Import" : "Import"}
          </button>
          <TagManager tags={tags} onRefresh={() => {}} />
        </div>
      </div>

      {/* IBKR Import section */}
      {showImport && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <IBKRImport />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <input
          type="text"
          placeholder="Search ticker or notes..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className={`${inputClass} w-48`}
        />
        <select
          value={filters.direction}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              direction: e.target.value as TradeFilters["direction"],
            }))
          }
          className={inputClass}
        >
          <option value="all">All Directions</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
        <select
          value={filters.result}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              result: e.target.value as TradeFilters["result"],
            }))
          }
          className={inputClass}
        >
          <option value="all">All Results</option>
          <option value="win">Winners</option>
          <option value="loss">Losers</option>
          <option value="open">Open</option>
        </select>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          className={inputClass}
          title="From date"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          className={inputClass}
          title="To date"
        />
      </div>

      {/* Tag filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  tags: f.tags.includes(tag.name)
                    ? f.tags.filter((t) => t !== tag.name)
                    : [...f.tags, tag.name],
                }))
              }
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                filters.tags.includes(tag.name)
                  ? "text-white border-transparent"
                  : "border-card-border text-muted hover:text-foreground"
              }`}
              style={
                filters.tags.includes(tag.name)
                  ? { backgroundColor: tag.color }
                  : undefined
              }
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-card border-b border-card-border">
              <th
                className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide cursor-pointer hover:text-foreground"
                onClick={() => handleSort("entry_date")}
              >
                Date{sortIcon("entry_date")}
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide cursor-pointer hover:text-foreground"
                onClick={() => handleSort("ticker")}
              >
                Symbol{sortIcon("ticker")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">
                Status
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide cursor-pointer hover:text-foreground"
                onClick={() => handleSort("direction")}
              >
                Side{sortIcon("direction")}
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
              <th
                className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide cursor-pointer hover:text-foreground"
                onClick={() => handleSort("pnl")}
              >
                Return{sortIcon("pnl")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">
                Tags
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted">
                  No trades found
                </td>
              </tr>
            ) : (
              filtered.map((trade) => (
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
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        trade.direction === "long"
                          ? "bg-green/15 text-green"
                          : "bg-red/15 text-red"
                      }`}
                    >
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{trade.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(trade.entry_price)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted">
                    {trade.exit_price !== null ? formatCurrency(trade.exit_price) : "-"}
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
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {trade.strategy_tags.map((tag) => {
                        const tagObj = tags.find((t) => t.name === tag);
                        return (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                            style={{ backgroundColor: tagObj?.color || "#6b7280" }}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        Showing {filtered.length} of {trades.length} trades
      </p>
    </div>
  );
}
