"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { Trade, Tag } from "./types";

interface TradeContextType {
  trades: Trade[];
  tags: Tag[];
  loading: boolean;
  refresh: () => Promise<void>;
  showTradeModal: boolean;
  setShowTradeModal: (v: boolean) => void;
  editingTrade: Trade | null;
  setEditingTrade: (t: Trade | null) => void;
}

const TradeContext = createContext<TradeContextType | null>(null);

export function TradeProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const refresh = useCallback(async () => {
    const [tradesRes, tagsRes] = await Promise.all([
      supabase.from("trades").select("*").order("entry_date", { ascending: false }),
      supabase.from("tags").select("*").order("name"),
    ]);
    setTrades(tradesRes.data || []);
    setTags(tagsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <TradeContext.Provider
      value={{
        trades,
        tags,
        loading,
        refresh,
        showTradeModal,
        setShowTradeModal,
        editingTrade,
        setEditingTrade,
      }}
    >
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  const ctx = useContext(TradeContext);
  if (!ctx) throw new Error("useTrades must be used within TradeProvider");
  return ctx;
}
