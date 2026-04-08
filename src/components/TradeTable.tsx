"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Trade, TradeFilters, Tag } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface TradeTableProps {
  trades: Trade[];
  tags: Tag[];
  onRefresh: () => void;
}

type SortKey = "entry_date" | "ticker" | "pnl" | "direction";
type SortDir = "asc" | "desc";

export default function TradeTable({ trades, tags, onRefresh }: TradeTableProps) {
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
  const [deleting, setDeleting] = useState<string | null>(null);

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

  async function handleDelete(id: string) {
    if (!confirm("Delete this trade?")) return;
    setDeleting(id);
    await supabase.from("trades").delete().eq("id", id);
    setDeleting(null);
    onRefresh();
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const selectClass =
    "px-3 py-1.5 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";
  const inputClass =
    "px-3 py-1.5 bg-background border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="space-y-4">
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
            setFilters((f) => ({ ...f, direction: e.target.value as TradeFilters["direction"] }))
          }
          className={selectClass}
        >
          <option value="all">All Directions</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
        <select
          value={filters.result}
          onChange={(e) =>
            setFilters((f) => ({ ...f, result: e.target.value as TradeFilters["result"] }))
          }
          className={selectClass}
        >
          <option value="all">All Results</option>
          <option value="win">Winners</option>
          <option value="loss">Losers</option>
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
                filters.tags.includes(tag.name) ? { backgroundColor: tag.color } : undefined
              }
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-card-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-card border-b border-card-border">
              <th
                className="px-4 py-3 text-left font-medium text-muted cursor-pointer hover:text-foreground"
                onClick={() => handleSort("entry_date")}
              >
                Date{sortIcon("entry_date")}
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-muted cursor-pointer hover:text-foreground"
                onClick={() => handleSort("ticker")}
              >
                Ticker{sortIcon("ticker")}
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-muted cursor-pointer hover:text-foreground"
                onClick={() => handleSort("direction")}
              >
                Dir{sortIcon("direction")}
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted">Entry</th>
              <th className="px-4 py-3 text-right font-medium text-muted">Exit</th>
              <th className="px-4 py-3 text-right font-medium text-muted">Qty</th>
              <th
                className="px-4 py-3 text-right font-medium text-muted cursor-pointer hover:text-foreground"
                onClick={() => handleSort("pnl")}
              >
                P&L{sortIcon("pnl")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted">Tags</th>
              <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  No trades found
                </td>
              </tr>
            ) : (
              filtered.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b border-card-border hover:bg-card/50 transition-colors"
                >
                  <td className="px-4 py-3">{formatDate(trade.entry_date)}</td>
                  <td className="px-4 py-3 font-medium">{trade.ticker}</td>
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
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(trade.entry_price)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {trade.exit_price !== null ? formatCurrency(trade.exit_price) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{trade.quantity}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-medium ${
                      trade.pnl === null
                        ? "text-muted"
                        : trade.pnl > 0
                        ? "text-green"
                        : "text-red"
                    }`}
                  >
                    {trade.pnl !== null ? formatCurrency(trade.pnl) : "Open"}
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
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/trades/${trade.id}`}
                        className="text-accent hover:text-accent-hover text-xs font-medium"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(trade.id)}
                        disabled={deleting === trade.id}
                        className="text-red hover:text-red/80 text-xs font-medium disabled:opacity-50"
                      >
                        {deleting === trade.id ? "..." : "Delete"}
                      </button>
                    </div>
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
