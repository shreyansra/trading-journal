"use client";

import { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTrades } from "@/lib/TradeContext";
import { computeStats } from "@/lib/utils";
import Sidebar from "./Sidebar";
import TradeModal from "./TradeModal";

export default function AppShell({ children }: { children: ReactNode }) {
  const { trades, loading, showTradeModal, setShowTradeModal, editingTrade, setEditingTrade } =
    useTrades();
  const router = useRouter();
  const pathname = usePathname();

  const stats = computeStats(trades);

  function handleNewTrade() {
    setEditingTrade(null);
    setShowTradeModal(true);
  }

  function handleUploadTrade() {
    router.push("/add");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
          <span className="text-sm text-muted">Loading trades...</span>
        </div>
      </div>
    );
  }

  // Get page title based on route
  const pageTitle = (() => {
    if (pathname === "/") return "Dashboard";
    if (pathname === "/stats") return "Stats";
    if (pathname === "/calendar") return "Calendar";
    if (pathname === "/trades") return "Trade Journal";
    if (pathname === "/add") return "Upload Trade";
    return "TradeJournal";
  })();

  return (
    <div className="flex min-h-screen">
      <Sidebar totalPnl={stats.totalPnl} onNewTrade={handleNewTrade} onUploadTrade={handleUploadTrade} />

      <div className="flex-1 lg:ml-52">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-card-border">
          <div className="pt-[52px] lg:pt-0 flex items-center justify-between px-4 md:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-4">
              <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
                {pageTitle === "Dashboard" && (
                  <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
                  </svg>
                )}
                {pageTitle}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* PnL display */}
              <div className={`text-sm font-bold font-mono ${stats.totalPnl >= 0 ? "text-green" : "text-red"}`}>
                {stats.totalPnl >= 0 ? "+" : ""}
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(stats.totalPnl)}
              </div>
            </div>
          </div>
        </div>

        <main className="p-4 md:p-6 lg:p-8 max-w-[1600px]">
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
