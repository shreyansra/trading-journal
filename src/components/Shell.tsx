"use client";

import { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTrades } from "@/lib/TradeContext";
import { computeStats, fmtCurrency } from "@/lib/utils";
import TradeModal from "./TradeModal";

const NAV = [
  { href: "/", label: "Dashboard", d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/stats", label: "Stats", d: "M3 13h2v8H3zm6-4h2v12H9zm6-6h2v18h-2zm6 10h2v8h-2z" },
  { href: "/calendar", label: "Calendar", d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/trades", label: "Trade Journal", d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { trades, loading, showModal, setShowModal, editingTrade, setEditingTrade } = useTrades();
  const router = useRouter();
  const path = usePathname();
  const stats = computeStats(trades);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  const pageName = (() => {
    if (path === "/") return "Dashboard";
    if (path.startsWith("/stats")) return "Stats";
    if (path.startsWith("/calendar")) return "Calendar";
    if (path.startsWith("/trades")) return "Trade Journal";
    if (path.startsWith("/add")) return "Upload Trade";
    return "";
  })();

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-52 bg-bg-card border-r border-border z-40">
        {/* Upload button */}
        <div className="px-3 pt-4 pb-1">
          <button
            onClick={() => router.push("/add")}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-[13px] font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Trade
          </button>
        </div>

        {/* Logo */}
        <div className="px-4 py-3 text-lg font-bold tracking-tight select-none">
          My <span className="text-loss">P</span>n<span className="text-profit">L</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  active ? "bg-accent/15 text-accent" : "text-text-dim hover:text-text hover:bg-border/30"
                }`}
              >
                <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.d} />
                </svg>
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-4 space-y-2">
          <button
            onClick={() => { setEditingTrade(null); setShowModal(true); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border border-profit/30 text-profit bg-profit/10 hover:bg-profit/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Trade
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 lg:ml-52">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-12 bg-bg/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3">
            {/* Mobile logo */}
            <span className="lg:hidden text-base font-bold">
              My <span className="text-loss">P</span>n<span className="text-profit">L</span>
            </span>
            <span className="hidden lg:block text-sm font-medium text-text-dim">{pageName}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-sm font-bold font-mono ${stats.totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
              {stats.totalPnl >= 0 ? "+" : ""}{fmtCurrency(stats.totalPnl)}
            </span>
            {/* Mobile new trade */}
            <button
              onClick={() => { setEditingTrade(null); setShowModal(true); }}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-accent text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6 max-w-[1500px]">{children}</main>
      </div>

      {/* ── Trade Modal ── */}
      {showModal && (
        <TradeModal
          trade={editingTrade}
          onClose={() => { setShowModal(false); setEditingTrade(null); }}
        />
      )}
    </div>
  );
}
