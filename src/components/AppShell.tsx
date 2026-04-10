"use client";

import { ReactNode } from "react";
import { useTrades } from "@/lib/TradeContext";
import { computeStats } from "@/lib/utils";
import Sidebar from "./Sidebar";
import TradeModal from "./TradeModal";
import TimePeriodFilter from "./TimePeriodFilter";

export default function AppShell({ children }: { children: ReactNode }) {
  const { trades, loading, showTradeModal, setShowTradeModal, editingTrade, setEditingTrade } =
    useTrades();

  const stats = computeStats(trades);

  function handleNewTrade() {
    setEditingTrade(null);
    setShowTradeModal(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
          <span className="text-sm text-muted">Loading trades...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar totalPnl={stats.totalPnl} onNewTrade={handleNewTrade} />

      <div className="flex-1 lg:ml-56">
        {/* Top bar with period filters */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-card-border">
          <div className="pt-[52px] lg:pt-0">
            <TimePeriodFilter />
          </div>
        </div>

        <main className="p-4 md:p-6 lg:p-8 max-w-[1400px]">
          {children}
        </main>
      </div>

      {showTradeModal && (
        <TradeModal
          trade={editingTrade}
          onClose={() => {
            setShowTradeModal(false);
            setEditingTrade(null);
          }}
        />
      )}
    </div>
  );
}
