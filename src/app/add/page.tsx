"use client";

import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { calculatePnl } from "@/lib/utils";
import { useTrades } from "@/lib/TradeContext";
import { Trade } from "@/lib/types";

type TabKey = "file-import" | "screenshot" | "manual-entry";

export default function UploadTradePage() {
  const { refresh, setShowTradeModal, setEditingTrade } = useTrades();
  const [activeTab, setActiveTab] = useState<TabKey>("file-import");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [manualTicker, setManualTicker] = useState("");
  const [manualDirection, setManualDirection] = useState<"long" | "short">("long");
  const [manualEntryPrice, setManualEntryPrice] = useState("");
  const [manualExitPrice, setManualExitPrice] = useState("");
  const [manualQuantity, setManualQuantity] = useState("");
  const [manualEntryDate, setManualEntryDate] = useState(new Date().toISOString().slice(0, 16));
  const [manualExitDate, setManualExitDate] = useState("");
  const [manualFees, setManualFees] = useState("0.65");
  const [manualNotes, setManualNotes] = useState("");
  const [manualSaving, setManualSaving] = useState(false);

  // File import via drag and drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    await handleFileImport(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
  });

  async function handleFileImport(file: File) {
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
            const pnl = exitPrice !== null ? calculatePnl(direction, entryPrice, exitPrice, quantity, fees) : null;

            return {
              ticker: (row.ticker || row.symbol || "").toUpperCase(),
              direction,
              entry_price: entryPrice,
              exit_price: exitPrice,
              quantity,
              entry_date: row.entry_date || new Date().toISOString(),
              exit_date: row.exit_date || null,
              pnl,
              fees,
              notes: row.notes || "",
              strategy_tags: row.strategy_tags ? row.strategy_tags.split(";").filter(Boolean) : [],
              screenshot_urls: [],
            };
          });

          const { error } = await supabase.from("trades").insert(tradesToInsert);
          if (error) throw error;

          setImportResult({ success: true, message: `Successfully imported ${tradesToInsert.length} trades` });
          await refresh();
        } catch (err: unknown) {
          setImportResult({ success: false, message: `Import failed: ${err instanceof Error ? err.message : "Unknown error"}` });
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
    });
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualSaving(true);

    try {
      const entry = parseFloat(manualEntryPrice);
      const exit = manualExitPrice ? parseFloat(manualExitPrice) : null;
      const qty = parseFloat(manualQuantity);
      const fee = parseFloat(manualFees) || 0;
      const pnl = exit !== null ? calculatePnl(manualDirection, entry, exit, qty, fee) : null;

      const tradeData = {
        ticker: manualTicker.toUpperCase(),
        direction: manualDirection,
        entry_price: entry,
        exit_price: exit,
        quantity: qty,
        entry_date: manualEntryDate,
        exit_date: manualExitDate || null,
        pnl,
        fees: fee,
        notes: manualNotes,
        strategy_tags: [],
        screenshot_urls: [],
      };

      const { error } = await supabase.from("trades").insert(tradeData);
      if (error) throw error;

      await refresh();
      // Reset form
      setManualTicker("");
      setManualEntryPrice("");
      setManualExitPrice("");
      setManualQuantity("");
      setManualEntryDate(new Date().toISOString().slice(0, 16));
      setManualExitDate("");
      setManualFees("0.65");
      setManualNotes("");
      setImportResult({ success: true, message: "Trade added successfully" });
    } catch (err: unknown) {
      setImportResult({ success: false, message: `Failed to add trade: ${err instanceof Error ? err.message : "Unknown error"}` });
    } finally {
      setManualSaving(false);
    }
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    {
      key: "file-import",
      label: "File Import",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      ),
    },
    {
      key: "screenshot",
      label: "Screenshot",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
    },
    {
      key: "manual-entry",
      label: "Manual Entry",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      ),
    },
  ];

  const inputClass = "w-full px-3 py-2.5 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm font-mono";
  const labelClass = "block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 bg-card border border-card-border rounded-xl p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setImportResult(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.key
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground hover:bg-card-border/30"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Import Result */}
      {importResult && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          importResult.success ? "bg-green/10 border border-green/30 text-green" : "bg-red/10 border border-red/30 text-red"
        }`}>
          {importResult.message}
        </div>
      )}

      {/* File Import Tab */}
      {activeTab === "file-import" && (
        <div className="bg-card border border-card-border rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Add File to Import</h3>
            <p className="text-xs text-muted">File must be under 25MB. Supported: CSV, export CSV only.</p>
          </div>

          {/* Broker selector placeholder */}
          <div>
            <label className={labelClass}>My brokerage isn't listed</label>
            <select className={inputClass}>
              <option>Generic CSV</option>
              <option>Interactive Brokers</option>
              <option>TD Ameritrade</option>
              <option>Robinhood</option>
            </select>
          </div>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-accent bg-accent/5"
                : "border-card-border hover:border-accent/50"
            }`}
          >
            <input {...getInputProps()} />
            <svg className="w-12 h-12 mx-auto mb-4 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {importing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
                <span className="text-sm text-muted">Processing...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted mb-2">
                  {isDragActive ? "Drop your CSV here..." : "Drag and drop your CSV file here"}
                </p>
                <p className="text-xs text-muted/60">or click to browse</p>
              </>
            )}
          </div>

          <p className="text-xs text-muted text-center">
            Make sure the CSV contains: ticker, direction, entry_price, exit_price, quantity, entry_date, exit_date, fees
          </p>
        </div>
      )}

      {/* Screenshot Tab */}
      {activeTab === "screenshot" && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-foreground mb-2">Screenshot Import</h3>
            <p className="text-xs text-muted">Drag and drop a screenshot to auto-extract trade data.</p>
            <button className="mt-4 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-semibold transition-colors">
              Choose Screenshot
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Tab */}
      {activeTab === "manual-entry" && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <form onSubmit={handleManualSubmit} className="space-y-5">
            {/* Row 1: Symbol + Direction */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Symbol</label>
                <input type="text" value={manualTicker} onChange={(e) => setManualTicker(e.target.value)} className={inputClass} placeholder="AAPL" required />
              </div>
              <div>
                <label className={labelClass}>Direction</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setManualDirection("long")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${manualDirection === "long" ? "bg-green text-white" : "bg-card-border/30 text-muted"}`}>
                    Long
                  </button>
                  <button type="button" onClick={() => setManualDirection("short")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${manualDirection === "short" ? "bg-red text-white" : "bg-card-border/30 text-muted"}`}>
                    Short
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Entry/Exit Price + Quantity */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Entry Price</label>
                <input type="number" step="any" value={manualEntryPrice} onChange={(e) => setManualEntryPrice(e.target.value)} className={inputClass} placeholder="0.00" required />
              </div>
              <div>
                <label className={labelClass}>Exit Price</label>
                <input type="number" step="any" value={manualExitPrice} onChange={(e) => setManualExitPrice(e.target.value)} className={inputClass} placeholder="0.00 (optional)" />
              </div>
              <div>
                <label className={labelClass}>Quantity</label>
                <input type="number" step="any" value={manualQuantity} onChange={(e) => setManualQuantity(e.target.value)} className={inputClass} placeholder="100" required />
              </div>
            </div>

            {/* Row 3: Dates + Fees */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Entry Date</label>
                <input type="datetime-local" value={manualEntryDate} onChange={(e) => setManualEntryDate(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Exit Date</label>
                <input type="datetime-local" value={manualExitDate} onChange={(e) => setManualExitDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fees / Commission</label>
                <input type="number" step="any" value={manualFees} onChange={(e) => setManualFees(e.target.value)} className={inputClass} placeholder="0.65" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>Notes</label>
              <textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} rows={3} className={inputClass} placeholder="Trade rationale, market conditions..." />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => {
                setManualTicker(""); setManualEntryPrice(""); setManualExitPrice("");
                setManualQuantity(""); setManualFees("0.65"); setManualNotes("");
              }} className="px-5 py-2.5 text-muted hover:text-foreground rounded-lg text-sm font-medium transition-colors">
                Reset
              </button>
              <button type="submit" disabled={manualSaving}
                className="px-8 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                {manualSaving ? "Saving..." : "Add Trade"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
