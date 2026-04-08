"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Trade } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { calculatePnl } from "@/lib/utils";

interface CsvImportExportProps {
  trades: Trade[];
  onRefresh: () => void;
}

export default function CsvImportExport({ trades, onRefresh }: CsvImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const exportData = trades.map((t) => ({
      ticker: t.ticker,
      direction: t.direction,
      entry_price: t.entry_price,
      exit_price: t.exit_price ?? "",
      quantity: t.quantity,
      entry_date: t.entry_date,
      exit_date: t.exit_date ?? "",
      pnl: t.pnl ?? "",
      fees: t.fees,
      notes: t.notes,
      strategy_tags: t.strategy_tags.join(";"),
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          const tradesToInsert = rows.map((row) => {
            const direction = (row.direction?.toLowerCase() || "long") as "long" | "short";
            const entryPrice = parseFloat(row.entry_price) || 0;
            const exitPrice = row.exit_price ? parseFloat(row.exit_price) : null;
            const quantity = parseFloat(row.quantity) || 0;
            const fees = parseFloat(row.fees) || 0;
            const pnl =
              exitPrice !== null
                ? calculatePnl(direction, entryPrice, exitPrice, quantity, fees)
                : null;

            return {
              ticker: (row.ticker || "").toUpperCase(),
              direction,
              entry_price: entryPrice,
              exit_price: exitPrice,
              quantity,
              entry_date: row.entry_date || new Date().toISOString(),
              exit_date: row.exit_date || null,
              pnl,
              fees,
              notes: row.notes || "",
              strategy_tags: row.strategy_tags
                ? row.strategy_tags.split(";").filter(Boolean)
                : [],
              screenshot_urls: [],
            };
          });

          const { error } = await supabase.from("trades").insert(tradesToInsert);
          if (error) throw error;

          setImportResult(`Successfully imported ${tradesToInsert.length} trades`);
          onRefresh();
        } catch (err: unknown) {
          setImportResult(
            `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleExport}
        disabled={trades.length === 0}
        className="px-3 py-1.5 bg-background border border-card-border text-sm text-muted hover:text-foreground rounded-lg transition-colors disabled:opacity-50"
      >
        Export CSV
      </button>
      <label className="px-3 py-1.5 bg-background border border-card-border text-sm text-muted hover:text-foreground rounded-lg transition-colors cursor-pointer">
        {importing ? "Importing..." : "Import CSV"}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleImport}
          className="hidden"
          disabled={importing}
        />
      </label>
      {importResult && (
        <span
          className={`text-xs ${
            importResult.startsWith("Successfully") ? "text-green" : "text-red"
          }`}
        >
          {importResult}
        </span>
      )}
    </div>
  );
}
