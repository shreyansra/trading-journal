"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Trade } from "@/lib/types";
import { computeStats } from "@/lib/utils";
import Dashboard from "@/components/Dashboard";
import Charts from "@/components/Charts";

export default function HomePage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("trades")
        .select("*")
        .order("entry_date", { ascending: false });
      setTrades(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = computeStats(trades);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Dashboard stats={stats} />
      <Charts trades={trades} />
    </div>
  );
}
