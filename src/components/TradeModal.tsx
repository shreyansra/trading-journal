"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";
import { Trade, Tag } from "@/lib/types";
import { calcPnl } from "@/lib/utils";
import { useTrades } from "@/lib/TradeContext";

interface Props {
  trade?: Trade | null;
  onClose: () => void;
}

export default function TradeModal({ trade, onClose }: Props) {
  const { refresh, tags: allTags } = useTrades();
  const editing = !!trade;

  const [ticker, setTicker] = useState(trade?.ticker ?? "");
  const [dir, setDir] = useState<"long" | "short">(trade?.direction ?? "long");
  const [entryPrice, setEntryPrice] = useState(trade?.entry_price?.toString() ?? "");
  const [exitPrice, setExitPrice] = useState(trade?.exit_price?.toString() ?? "");
  const [qty, setQty] = useState(trade?.quantity?.toString() ?? "");
  const [entryDate, setEntryDate] = useState(trade?.entry_date?.slice(0, 16) ?? new Date().toISOString().slice(0, 16));
  const [exitDate, setExitDate] = useState(trade?.exit_date?.slice(0, 16) ?? "");
  const [fees, setFees] = useState(trade?.fees?.toString() ?? "0");
  const [notes, setNotes] = useState(trade?.notes ?? "");
  const [tags, setTags] = useState<string[]>(trade?.strategy_tags ?? []);
  const [shots, setShots] = useState<File[]>([]);
  const [existingShots, setExistingShots] = useState<string[]>(trade?.screenshot_urls ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const onDrop = useCallback((f: File[]) => setShots((p) => [...p, ...f]), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
  });

  async function uploadShots(): Promise<string[]> {
    const urls: string[] = [];
    for (const f of shots) {
      const ext = f.name.split(".").pop();
      const path = `screenshots/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("trade-screenshots").upload(path, f);
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
      let shotUrls = [...existingShots];
      if (shots.length) shotUrls = [...shotUrls, ...(await uploadShots())];

      const ep = parseFloat(entryPrice);
      const xp = exitPrice ? parseFloat(exitPrice) : null;
      const q = parseFloat(qty);
      const f = parseFloat(fees) || 0;
      const pnl = xp != null ? calcPnl(dir, ep, xp, q, f) : null;

      const data = {
        ticker: ticker.toUpperCase(),
        direction: dir,
        entry_price: ep,
        exit_price: xp,
        quantity: q,
        entry_date: entryDate,
        exit_date: exitDate || null,
        pnl,
        fees: f,
        notes,
        strategy_tags: tags,
        screenshot_urls: shotUrls,
      };

      if (editing) {
        const { error } = await supabase.from("trades").update(data).eq("id", trade.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trades").insert(data);
        if (error) throw error;
      }

      await refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
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

  const inp = "w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent";
  const lbl = "block text-[11px] font-semibold text-text-dim uppercase tracking-wider mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 anim-fade" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-bg-card border border-border rounded-xl shadow-2xl anim-slide-up max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h2 className="text-base font-bold">{editing ? "Edit Trade" : "New Trade"}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-border/40 text-text-dim hover:text-text transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg bg-loss/10 border border-loss/30 text-loss text-sm">{error}</div>}

          {/* Symbol + Direction */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Symbol</label>
              <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)} className={inp} placeholder="AAPL" required />
            </div>
            <div>
              <label className={lbl}>Direction</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDir("long")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${dir === "long" ? "bg-profit text-black" : "bg-border/40 text-text-dim"}`}>
                  LONG
                </button>
                <button type="button" onClick={() => setDir("short")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${dir === "short" ? "bg-loss text-white" : "bg-border/40 text-text-dim"}`}>
                  SHORT
                </button>
              </div>
            </div>
          </div>

          {/* Prices + Qty */}
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Entry Price</label><input type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className={inp} placeholder="0.00" required /></div>
            <div><label className={lbl}>Exit Price</label><input type="number" step="any" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} className={inp} placeholder="Optional" /></div>
            <div><label className={lbl}>Quantity</label><input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className={inp} placeholder="100" required /></div>
          </div>

          {/* Dates + Fees */}
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Entry Date</label><input type="datetime-local" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={inp} required /></div>
            <div><label className={lbl}>Exit Date</label><input type="datetime-local" value={exitDate} onChange={(e) => setExitDate(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Fees</label><input type="number" step="any" value={fees} onChange={(e) => setFees(e.target.value)} className={inp} /></div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <label className={lbl}>Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag: Tag) => (
                  <button key={tag.id} type="button"
                    onClick={() => setTags((p) => p.includes(tag.name) ? p.filter((t) => t !== tag.name) : [...p, tag.name])}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
                      tags.includes(tag.name) ? "text-white border-transparent" : "border-border text-text-dim hover:text-text"
                    }`}
                    style={tags.includes(tag.name) ? { backgroundColor: tag.color } : undefined}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={lbl}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inp} placeholder="Trade rationale..." />
          </div>

          {/* Screenshots */}
          <div>
            <label className={lbl}>Screenshots</label>
            <div {...getRootProps()} className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors text-xs ${isDragActive ? "border-accent bg-accent/5 text-accent" : "border-border text-text-dim hover:border-accent/50"}`}>
              <input {...getInputProps()} />
              {isDragActive ? "Drop here..." : "Drag & drop or click to add screenshots"}
            </div>
            {(existingShots.length > 0 || shots.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {existingShots.map((u) => (
                  <div key={u} className="relative group">
                    <img src={u} alt="" className="w-16 h-16 object-cover rounded border border-border" />
                    <button type="button" onClick={() => setExistingShots((p) => p.filter((x) => x !== u))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-loss text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                  </div>
                ))}
                {shots.map((f, i) => (
                  <div key={i} className="relative group">
                    <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded border border-border" />
                    <button type="button" onClick={() => setShots((p) => p.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-loss text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            {editing ? (
              <button type="button" onClick={handleDelete} className="px-4 py-2 bg-loss/10 hover:bg-loss/20 text-loss rounded-lg text-sm font-medium transition-colors">
                Delete
              </button>
            ) : <div />}
            <button type="submit" disabled={saving}
              className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
