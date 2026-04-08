"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Trade, Tag } from "@/lib/types";
import TradeTable from "@/components/TradeTable";
import TagManager from "@/components/TagManager";
import CsvImportExport from "@/components/CsvImportExport";

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [tradesRes, tagsRes] = await Promise.all([
      supabase.from("trades").select("*").order("entry_date", { ascending: false }),
      supabase.from("tags").select("*").order("name"),
    ]);
    setTrades(tradesRes.data || []);
    setTags(tagsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Trades</h1>
        <div className="flex items-center gap-4">
          <CsvImportExport trades={trades} onRefresh={loadData} />
          <TagManager tags={tags} onRefresh={loadData} />
        </div>
      </div>
      <TradeTable trades={trades} tags={tags} onRefresh={loadData} />
    </div>
  );
}
