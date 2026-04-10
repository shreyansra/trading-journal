"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";
import { Trade, Tag } from "@/lib/types";
import { calculatePnl } from "@/lib/utils";
import { useTrades } from "@/lib/TradeContext";

interface TradeModalProps {
  trade?: Trade | null;
  onClose: () => void;
}

export default function TradeModal({ trade, onClose }: TradeModalProps) {
  const { refresh, tags: allTags } = useTrades();
  const isEditing = !!trade;

  const [tab, setTab] = useState<"general" | "journal">("general");
  const [ticker, setTicker] = useState(trade?.ticker || "");
  const [direction, setDirection] = useState<"long" | "short">(trade?.direction || "long");
  const [entryPrice, setEntryPrice] = useState(trade?.entry_price?.toString() || "");
  const [exitPrice, setExitPrice] = useState(trade?.exit_price?.toString() || "");
  const [quantity, setQuantity] = useState(trade?.quantity?.toString() || "");
  const [entryDate, setEntryDate] = useState(trade?.entry_date?.slice(0, 16) || new Date().toISOString().slice(0, 16));
  const [exitDate, setExitDate] = useState(trade?.exit_date?.slice(0, 16) || "");
  const [fees, setFees] = useState(trade?.fees?.toString() || "0.65");
  const [notes, setNotes] = useState(trade?.notes || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(trade?.strategy_tags || []);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [existingScreenshots, setExistingScreenshots] = useState<string[]>(trade?.screenshot_urls || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [target, setTarget] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setScreenshots((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
  });

  async function uploadScreenshots(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of screenshots) {
      const ext = file.name.split(".").pop();
      const path = `screenshots/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("trade-screenshots").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("trade-screenshots").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      let screenshotUrls = [...existingScreenshots];
      if (screenshots.length > 0) {
        const newUrls = await uploadScreenshots();
        screenshotUrls = [...screenshotUrls, ...newUrls];
      }

      const entry = parseFloat(entryPrice);
      const exit = exitPrice ? parseFloat(exitPrice) : null;
      const qty = parseFloat(quantity);
      const fee = parseFloat(fees) || 0;
      const pnl = exit !== null ? calculatePnl(direction, entry, exit, qty, fee) : null;

      const tradeData = {
        ticker: ticker.toUpperCase(),
        direction,
        entry_price: entry,
        exit_price: exit,
        quantity: qty,
        entry_date: entryDate,
        exit_date: exitDate || null,
        pnl,
        fees: fee,
        notes,
        strategy_tags: selectedTags,
        screenshot_urls: screenshotUrls,
      };

      if (isEditing) {
        const { error } = await supabase.from("trades").update(tradeData).eq("id", trade.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trades").insert(tradeData);
        if (error) throw error;
      }

      await refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save trade");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!trade || !confirm("Delete this trade?")) return;
    await supabase.from("trades").delete().eq("id", trade.id);
    await refresh();
    onClose();
  }

  // Risk/reward calculation
  const rrRatio = (() => {
    const e = parseFloat(entryPrice);
    const t = parseFloat(target);
    const s = parseFloat(stopLoss);
    if (!e || !s || !t || s === e) return null;
    const reward = Math.abs(t - e);
    const risk = Math.abs(e - s);
    return risk > 0 ? (reward / risk).toFixed(2) : null;
  })();

  const inputClass =
    "w-full px-3 py-2.5 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm";
  const labelClass = "block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 modal-backdrop" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-card border border-card-border rounded-2xl shadow-2xl modal-content max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-lg font-bold text-foreground">
            {isEditing ? "Edit Trade" : "New Trade"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-card-border">
          <button
            onClick={() => setTab("general")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              tab === "general"
                ? "text-foreground border-b-2 border-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            General
          </button>
          <button
            onClick={() => setTab("journal")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              tab === "journal"
                ? "text-foreground border-b-2 border-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            Journal
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red/10 border border-red text-red px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {tab === "general" && (
            <>
              {/* Symbol + Direction */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Symbol</label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    className={inputClass}
                    placeholder="AAPL"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Target</label>
                  <input
                    type="number"
                    step="any"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className={labelClass}>Stop-Loss</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="any"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className={`${inputClass} flex-1`}
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      onClick={() => setDirection(direction === "long" ? "short" : "long")}
                      className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                        direction === "long"
                          ? "bg-green text-white"
                          : "bg-red text-white"
                      }`}
                    >
                      {direction.toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>

              {rrRatio && (
                <div className="inline-block px-3 py-1.5 bg-cyan/10 border border-cyan/30 rounded-lg text-xs text-cyan font-medium">
                  Risk/Reward Ratio: {rrRatio}
                </div>
              )}

              {/* Execution row */}
              <div className="bg-background/50 border border-card-border rounded-lg p-4">
                <div className="grid grid-cols-5 gap-3 text-xs font-medium text-muted uppercase tracking-wide mb-3">
                  <span>Action</span>
                  <span>Date / Time</span>
                  <span>Quantity</span>
                  <span>Price</span>
                  <span>Fee</span>
                </div>
                <div className="grid grid-cols-5 gap-3 items-center">
                  <span className={`px-3 py-2 rounded-lg text-xs font-bold text-center text-white ${
                    direction === "long" ? "bg-green" : "bg-red"
                  }`}>
                    {direction === "long" ? "BUY" : "SELL"}
                  </span>
                  <input
                    type="datetime-local"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className={inputClass}
                    required
                  />
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={inputClass}
                    placeholder="100"
                    required
                  />
                  <input
                    type="number"
                    step="any"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className={inputClass}
                    placeholder="0.00"
                    required
                  />
                  <input
                    type="number"
                    step="any"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    className={inputClass}
                    placeholder="0.65"
                  />
                </div>

                {/* Exit row (if editing or has exit) */}
                {(isEditing || exitPrice) && (
                  <div className="grid grid-cols-5 gap-3 items-center mt-3">
                    <span className={`px-3 py-2 rounded-lg text-xs font-bold text-center text-white ${
                      direction === "long" ? "bg-red" : "bg-green"
                    }`}>
                      {direction === "long" ? "SELL" : "BUY"}
                    </span>
                    <input
                      type="datetime-local"
                      value={exitDate}
                      onChange={(e) => setExitDate(e.target.value)}
                      className={inputClass}
                    />
                    <input type="text" value={quantity} disabled className={`${inputClass} opacity-50`} />
                    <input
                      type="number"
                      step="any"
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className={inputClass}
                      placeholder="Exit price"
                    />
                    <input type="text" value="" disabled className={`${inputClass} opacity-50`} />
                  </div>
                )}

                {/* Add exit row button */}
                {!exitPrice && !isEditing && (
                  <button
                    type="button"
                    onClick={() => setExitPrice("")}
                    className="mt-3 mx-auto flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white hover:bg-accent-hover transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          )}

          {tab === "journal" && (
            <>
              {/* Notes */}
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  className={inputClass}
                  placeholder="Trade rationale, market conditions, lessons learned..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className={labelClass}>Tags</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag: Tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag.name)
                            ? prev.filter((t) => t !== tag.name)
                            : [...prev, tag.name]
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                        selectedTags.includes(tag.name)
                          ? "text-white border-transparent"
                          : "border-card-border text-muted hover:text-foreground"
                      }`}
                      style={
                        selectedTags.includes(tag.name) ? { backgroundColor: tag.color } : undefined
                      }
                    >
                      {tag.name}
                    </button>
                  ))}
                  {allTags.length === 0 && (
                    <span className="text-xs text-muted">No tags yet. Create tags from the Trades page.</span>
                  )}
                </div>
              </div>

              {/* Screenshots */}
              <div>
                <label className={labelClass}>Screenshots</label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-accent bg-accent/5"
                      : "border-card-border hover:border-accent"
                  }`}
                >
                  <input {...getInputProps()} />
                  <p className="text-sm text-muted">
                    {isDragActive
                      ? "Drop images here..."
                      : "Drag & drop chart screenshots, or click to select"}
                  </p>
                </div>
                {(existingScreenshots.length > 0 || screenshots.length > 0) && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {existingScreenshots.map((url) => (
                      <div key={url} className="relative group">
                        <img
                          src={url}
                          alt="Screenshot"
                          className="w-20 h-20 object-cover rounded-lg border border-card-border"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setExistingScreenshots((prev) => prev.filter((u) => u !== url))
                          }
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          x
                        </button>
                      </div>
                    ))}
                    {screenshots.map((file, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt="New screenshot"
                          className="w-20 h-20 object-cover rounded-lg border border-card-border"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setScreenshots((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-2">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-2.5 bg-red/10 hover:bg-red/20 text-red rounded-lg text-sm font-medium transition-colors"
              >
                Delete
              </button>
            ) : (
              <div />
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
