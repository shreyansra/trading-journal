"use client";

import { useState, useMemo } from "react";
import { useTrades } from "@/lib/TradeContext";
import { getCalendarData, formatCurrency } from "@/lib/utils";

export default function CalendarPage() {
  const { trades, setEditingTrade, setShowTradeModal } = useTrades();
  const calendarData = getCalendarData(trades);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const dataMap = useMemo(() => {
    const map = new Map<string, { pnl: number; tradeCount: number }>();
    calendarData.forEach((day) => {
      map.set(day.date, { pnl: day.pnl, tradeCount: day.tradeCount });
    });
    return map;
  }, [calendarData]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

    let totalPnl = 0;
    let tradingDays = 0;
    let winDays = 0;
    let lossDays = 0;
    let bestDay = -Infinity;
    let worstDay = Infinity;
    let maxAbsPnl = 0;

    calendarData.forEach((d) => {
      const date = new Date(d.date);
      if (date >= monthStart && date <= monthEnd) {
        totalPnl += d.pnl;
        tradingDays++;
        if (d.pnl > 0) winDays++;
        if (d.pnl < 0) lossDays++;
        bestDay = Math.max(bestDay, d.pnl);
        worstDay = Math.min(worstDay, d.pnl);
        maxAbsPnl = Math.max(maxAbsPnl, Math.abs(d.pnl));
      }
    });

    return { totalPnl, tradingDays, winDays, lossDays, bestDay, worstDay, maxAbsPnl };
  }, [calendarData, currentMonth, currentYear]);

  // Build calendar grid
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const firstDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) daysArray.push(null);
  for (let i = 1; i <= daysInMonth; i++) daysArray.push(i);

  const monthName = monthStart.toLocaleDateString("en-US", { month: "long" });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  function getCellStyle(pnl: number): React.CSSProperties {
    if (monthlySummary.maxAbsPnl === 0) return {};
    const intensity = Math.min(Math.abs(pnl) / monthlySummary.maxAbsPnl, 1);
    const alpha = 0.2 + intensity * 0.6;
    if (pnl > 0) return { backgroundColor: `rgba(0, 230, 118, ${alpha})` };
    if (pnl < 0) return { backgroundColor: `rgba(255, 82, 82, ${alpha})` };
    return {};
  }

  function handleDayClick(day: number) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTrades = trades.filter((t) => {
      const exitDate = t.exit_date?.slice(0, 10);
      const entryDate = t.entry_date?.slice(0, 10);
      return exitDate === dateStr || entryDate === dateStr;
    });
    if (dayTrades.length === 1) {
      setEditingTrade(dayTrades[0]);
      setShowTradeModal(true);
    }
  }

  return (
    <div className="space-y-6">
      {/* Calendar Card */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-card-border/30 rounded-lg transition-colors text-muted hover:text-foreground">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-foreground">{monthName} {currentYear}</h2>
          <button onClick={handleNextMonth} className="p-2 hover:bg-card-border/30 rounded-lg transition-colors text-muted hover:text-foreground">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted uppercase tracking-wide py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {daysArray.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const data = dataMap.get(dateStr);
            const hasData = data && data.tradeCount > 0;

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className="aspect-square rounded-lg border border-card-border flex flex-col items-center justify-center gap-0.5 cal-cell cursor-pointer"
                style={hasData ? getCellStyle(data.pnl) : {}}
                title={hasData ? `${formatCurrency(data.pnl)} (${data.tradeCount} trades)` : undefined}
              >
                <div className={`text-sm font-semibold ${hasData ? "text-white" : "text-muted"}`}>{day}</div>
                {hasData && (
                  <>
                    <div className="text-[10px] font-bold text-white/90">
                      {data.pnl > 0 ? "+" : ""}{formatCurrency(data.pnl)}
                    </div>
                    <div className="text-[9px] text-white/60">
                      {data.tradeCount}t
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total P&L" value={monthlySummary.totalPnl !== 0 ? `${monthlySummary.totalPnl > 0 ? "+" : ""}${formatCurrency(monthlySummary.totalPnl)}` : "--"}
          color={monthlySummary.totalPnl > 0 ? "text-green" : monthlySummary.totalPnl < 0 ? "text-red" : "text-muted"} />
        <SummaryCard label="Trading Days" value={monthlySummary.tradingDays.toString()} color="text-foreground" />
        <SummaryCard label="Win Days" value={monthlySummary.winDays.toString()} color="text-green" />
        <SummaryCard label="Loss Days" value={monthlySummary.lossDays.toString()} color="text-red" />
        <SummaryCard label="Best Day" value={monthlySummary.bestDay === -Infinity ? "--" : `+${formatCurrency(monthlySummary.bestDay)}`}
          color={monthlySummary.bestDay === -Infinity ? "text-muted" : "text-green"} />
        <SummaryCard label="Worst Day" value={monthlySummary.worstDay === Infinity ? "--" : formatCurrency(monthlySummary.worstDay)}
          color={monthlySummary.worstDay === Infinity ? "text-muted" : "text-red"} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="text-xs font-medium text-muted uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}
