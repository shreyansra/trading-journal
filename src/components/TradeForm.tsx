"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";
import { Trade, Tag } from "@/lib/types";
import { calculatePnl } from "@/lib/utils";

interface TradeFormProps {
  trade?: Trade;
}

export default function TradeForm({ trade }: TradeFormProps) {
  const router = useRouter();
  const isEditing = !!trade;

  const [ticker, setTicker] = useState(trade?.ticker || "");
  const [direction, setDirection] = useState<"long" | "short">(trade?.direction || "long");
  const [entryPrice, setEntryPrice] = useState(trade?.entry_price?.toString() || "");
  const [exitPrice, setExitPrice] = useState(trade?.exit_price?.toString() || "");
  const [quantity, setQuantity] = useState(trade?.quantity?.toString() || "");
  const [entryDate, setEntryDate] = useState(trade?.entry_date?.slice(0, 16) || "");
  const [exitDate, setExitDate] = useState(trade?.exit_date?.slice(0, 16) || "");
  const [fees, setFees] = useState(trade?.fees?.toString() || "0");
  const [notes, setNotes] = useState(trade?.notes || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(trade?.strategy_tags || []);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [existingScreenshots, setExistingScreenshots] = useState<string[]>(trade?.screenshot_urls || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("tags").select("*").order("name").then(({ data }) => {
      if (data) setAllTags(data);
    });
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setScreenshots((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
  });

  function removeNewScreenshot(index: number) {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExistingScreenshot(url: string) {
    setExistingScreenshots((prev) => prev.filter((u) => u !== url));
  }

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

      router.push("/trades");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save trade");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm";
  const labelClass = "block text-sm font-medium text-muted mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red/10 border border-red text-red px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Ticker</label>
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
          <label className={labelClass}>Direction</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection("long")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                direction === "long"
                  ? "bg-green text-white"
                  : "bg-background border border-card-border text-muted"
              }`}
            >
              Long
            </button>
            <button
              type="button"
              onClick={() => setDirection("short")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                direction === "short"
                  ? "bg-red text-white"
                  : "bg-background border border-card-border text-muted"
              }`}
            >
              Short
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Entry Price</label>
          <input
            type="number"
            step="any"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className={inputClass}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Exit Price</label>
          <input
            type="number"
            step="any"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            className={inputClass}
            placeholder="Leave empty if open"
          />
        </div>
        <div>
          <label className={labelClass}>Quantity</label>
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
            placeholder="100"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Entry Date</label>
          <input
            type="datetime-local"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Exit Date</label>
          <input
            type="datetime-local"
            value={exitDate}
            onChange={(e) => setExitDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Fees / Commission</label>
        <input
          type="number"
          step="any"
          value={fees}
          onChange={(e) => setFees(e.target.value)}
          className={inputClass}
          placeholder="0.00"
        />
      </div>

      <div>
        <label className={labelClass}>Strategy Tags</label>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
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
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
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

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="Trade rationale, market conditions, lessons learned..."
        />
      </div>

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
                  className="w-24 h-24 object-cover rounded-lg border border-card-border"
                />
                <button
                  type="button"
                  onClick={() => removeExistingScreenshot(url)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
            {screenshots.map((file, i) => (
              <div key={i} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt="New screenshot"
                  className="w-24 h-24 object-cover rounded-lg border border-card-border"
                />
                <button
                  type="button"
                  onClick={() => removeNewScreenshot(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : isEditing ? "Update Trade" : "Add Trade"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-background border border-card-border text-muted hover:text-foreground rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
