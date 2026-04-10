"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "./supabase";
import { Trade, Tag } from "./types";

interface Ctx {
  trades: Trade[];
  tags: Tag[];
  loading: boolean;
  refresh: () => Promise<void>;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  editingTrade: Trade | null;
  setEditingTrade: (t: Trade | null) => void;
}

const TradeCtx = createContext<Ctx | null>(null);

export function TradeProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const refresh = useCallback(async () => {
    const [tr, tg] = await Promise.all([
      supabase.from("trades").select("*").order("entry_date", { ascending: false }),
      supabase.from("tags").select("*").order("name"),
    ]);
    setTrades(tr.data || []);
    setTags(tg.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <TradeCtx.Provider
      value={{ trades, tags, loading, refresh, showModal, setShowModal, editingTrade, setEditingTrade }}
    >
      {children}
    </TradeCtx.Provider>
  );
}

export function useTrades() {
  const ctx = useContext(TradeCtx);
  if (!ctx) throw new Error("useTrades must be inside TradeProvider");
  return ctx;
}
