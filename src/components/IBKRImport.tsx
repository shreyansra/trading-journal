"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { useTrades } from "@/lib/TradeContext";

interface ParsedTrade {
  ticker: string;
  direction: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  entry_date: string;
  exit_date: string | null;
  pnl: number | null;
  fees: number;
  notes: string;
  strategy_tags: string[];
  screenshot_urls: string[];
}

export default function IBKRImport() {
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refresh } = useTrades();

  const extractBaseTicker = (symbol: string): string => {
    const parts = symbol.trim().split(/\s+/);
    return parts[0];
  };

  const parseIBKRFormat = (rows: string[][]): ParsedTrade[] => {
    const trades: ParsedTrade[] = [];

    for (const row of rows) {
      if (
        row.length < 16 ||
        row[0] !== "Trades" ||
        row[1] !== "Data" ||
        row[2] !== "Order"
      ) {
        continue;
      }

      try {
        const assetCategory = row[3];
        if (assetCategory !== "Stocks" && assetCategory !== "Equity and Index Options") {
          continue;
        }

        const symbol = row[5];
        const ticker = extractBaseTicker(symbol);
        const dateTimeStr = row[6];
        const quantity = parseFloat(row[7]);
        const tradePrice = parseFloat(row[8]);
        const commFee = parseFloat(row[11]);
        const realizedPnL = parseFloat(row[13]);
        const code = row[15];

        const dateObj = new Date(dateTimeStr);
        const entryDate = dateObj.toISOString();

        const trade: ParsedTrade = {
          ticker,
          direction: quantity > 0 ? "long" : "short",
          entry_price: tradePrice,
          exit_price: null,
          quantity: Math.abs(quantity),
          entry_date: entryDate,
          exit_date: null,
          pnl: realizedPnL !== 0 ? realizedPnL : null,
          fees: Math.abs(commFee),
          notes: code.includes("O") ? "Entry" : "Exit",
          strategy_tags: [],
          screenshot_urls: [],
        };

        trades.push(trade);
      } catch (e) {
        console.error("Error parsing IBKR row:", row, e);
      }
    }

    return trades;
  };

  const parseSimpleFormat = (rows: string[][]): ParsedTrade[] => {
    const trades: ParsedTrade[] = [];
    const headers = rows[0];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || row.length < 11) continue;

      try {
        const trade: ParsedTrade = {
          ticker: row[0],
          direction: (row[1] as "long" | "short") || "long",
          entry_price: parseFloat(row[2]) || 0,
          exit_price: row[3] ? parseFloat(row[3]) : null,
          quantity: parseFloat(row[4]) || 0,
          entry_date: row[5] || new Date().toISOString(),
          exit_date: row[6] || null,
          pnl: row[7] ? parseFloat(row[7]) : null,
          fees: parseFloat(row[8]) || 0,
          notes: row[9] || "",
          strategy_tags: row[10] ? row[10].split(";").map((s) => s.trim()) : [],
          screenshot_urls: [],
        };

        trades.push(trade);
      } catch (e) {
        console.error("Error parsing simple format row:", row, e);
      }
    }

    return trades;
  };

  const handleFileSelect = (file: File) => {
    setIsLoading(true);
    setError(null);
    setParsedTrades([]);

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results: any) => {
        try {
          const rows = results.data as string[][];

          if (rows.length === 0) {
            setError("CSV file is empty");
            setIsLoading(false);
            return;
          }

          let trades: ParsedTrade[] = [];

          if (rows[0][0] === "Statement" && rows[0][1] === "Header") {
            trades = parseIBKRFormat(rows);
          } else {
            trades = parseSimpleFormat(rows);
          }

          if (trades.length === 0) {
            setError("No valid trades found in file");
          } else {
            setParsedTrades(trades);
          }

          setIsLoading(false);
        } catch (err) {
          setError(
            `Error parsing file: ${err instanceof Error ? err.message : "Unknown error"}`
          );
          setIsLoading(false);
        }
      },
      error: (error: any) => {
        setError(`CSV parsing error: ${error.message}`);
        setIsLoading(false);
      },
    });
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const downloadSampleCSV = () => {
    const headers = [
      "ticker",
      "direction",
      "entry_price",
      "exit_price",
      "quantity",
      "entry_date",
      "exit_date",
      "pnl",
      "fees",
      "notes",
      "strategy_tags",
    ];

    const sampleData = [
      [
        "AAPL",
        "long",
        "150.00",
        "155.00",
        "100",
        "2026-01-15T10:00:00Z",
        "2026-01-16T14:30:00Z",
        "490.00",
        "10.00",
        "Example trade",
        "momentum;breakout",
      ],
      [
        "TSLA",
        "short",
        "245.50",
        "240.00",
        "50",
        "2026-02-01T09:30:00Z",
        "2026-02-05T16:00:00Z",
        "265.00",
        "15.00",
        "Support breakout short",
        "support;trend",
      ],
    ];

    const csv = [headers, ...sampleData].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample-trades.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    setIsLoading(true);
    try {
      const { error: insertError } = await supabase.from("trades").insert(parsedTrades);
      if (insertError) throw insertError;

      setParsedTrades([]);
      setError(null);
      await refresh();
    } catch (err) {
      setError(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="space-y-6">
        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
            isDragActive
              ? "border-accent bg-accent/10"
              : "border-card-border bg-card"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="space-y-3">
            <svg
              className="w-12 h-12 mx-auto text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <p className="text-foreground font-medium">
              Drag and drop your CSV file here
            </p>
            <p className="text-muted text-sm">
              or{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-accent hover:underline"
              >
                click to select
              </button>
            </p>
            <p className="text-muted text-xs">
              Supports IBKR monthly statements or simple CSV format
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={downloadSampleCSV}
            className="px-4 py-2 rounded border border-card-border text-muted hover:text-foreground hover:border-card-border transition"
          >
            Download Sample CSV
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded bg-red/10 border border-red text-red">
            {error}
          </div>
        )}

        {/* Preview Table */}
        {parsedTrades.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-foreground font-semibold">
              Preview: {parsedTrades.length} trades found
            </h3>
            <div className="overflow-x-auto border border-card-border rounded-lg bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border">
                    <th className="px-4 py-2 text-left text-muted">Ticker</th>
                    <th className="px-4 py-2 text-left text-muted">
                      Direction
                    </th>
                    <th className="px-4 py-2 text-right text-muted">
                      Entry Price
                    </th>
                    <th className="px-4 py-2 text-right text-muted">
                      Exit Price
                    </th>
                    <th className="px-4 py-2 text-right text-muted">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-right text-muted">
                      Entry Date
                    </th>
                    <th className="px-4 py-2 text-right text-muted">Fees</th>
                    <th className="px-4 py-2 text-right text-muted">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedTrades.slice(0, 10).map((trade, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-card-border hover:bg-card/80"
                    >
                      <td className="px-4 py-2 font-mono text-foreground">
                        {trade.ticker}
                      </td>
                      <td
                        className={`px-4 py-2 font-medium ${
                          trade.direction === "long"
                            ? "text-green"
                            : "text-red"
                        }`}
                      >
                        {trade.direction}
                      </td>
                      <td className="px-4 py-2 text-right text-foreground">
                        ${trade.entry_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-foreground">
                        {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-4 py-2 text-right text-foreground">
                        {trade.quantity}
                      </td>
                      <td className="px-4 py-2 text-right text-muted text-xs">
                        {new Date(trade.entry_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-right text-foreground">
                        ${trade.fees.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right ${
                          trade.pnl
                            ? trade.pnl > 0
                              ? "text-green"
                              : "text-red"
                            : "text-muted"
                        }`}
                      >
                        {trade.pnl ? `$${trade.pnl.toFixed(2)}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedTrades.length > 10 && (
              <p className="text-muted text-sm">
                Showing 10 of {parsedTrades.length} trades
              </p>
            )}

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {isLoading ? "Importing..." : `Import ${parsedTrades.length} Trades`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
