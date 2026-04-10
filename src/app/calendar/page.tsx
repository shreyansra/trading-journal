"use client";

import { useState } from "react";
import { useTrades } from "@/lib/TradeContext";
import { getCalendarData, formatCurrency } from "@/lib/utils";

export default function CalendarPage() {
  const { trades } = useTrades();
  const calendarData = getCalendarData(trades);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  // Create a map of date strings to calendar data for quick lookup
  const dataMap = new Map<string, { pnl: number; tradeCount: number }>();
  calendarData.forEach((day) => {
    dataMap.set(day.date, { pnl: day.pnl, tradeCount: day.tradeCount });
  });

  // Filter data for the current month
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const monthDataDates = calendarData
    .filter((d) => {
      const date = new Date(d.date);
      return date >= monthStart && date <= monthEnd;
    })
    .map((d) => d.date);

  // Calculate max absolute P&L for the month (for color intensity)
  let maxAbsPnl = 0;
  monthDataDates.forEach((date) => {
    const data = dataMap.get(date);
    if (data) {
      maxAbsPnl = Math.max(maxAbsPnl, Math.abs(data.pnl));
    }
  });

  // Build calendar grid
  const firstDay = monthStart.getDay(); // 0 = Sunday, 6 = Saturday
  const daysInMonth = monthEnd.getDate();
  const daysArray: (number | null)[] = [];

  // Add empty cells for days before the month starts
  for (let i = 0; i < firstDay; i++) {
    daysArray.push(null);
  }

  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i);
  }

  // Calculate monthly summary
  let totalMonthPnl = 0;
  let tradingDays = 0;
  let winDays = 0;
  let lossDays = 0;
  let bestDayPnl = -Infinity;
  let worstDayPnl = Infinity;

  monthDataDates.forEach((date) => {
    const data = dataMap.get(date);
    if (data) {
      totalMonthPnl += data.pnl;
      tradingDays++;
      if (data.pnl > 0) winDays++;
      if (data.pnl < 0) lossDays++;
      bestDayPnl = Math.max(bestDayPnl, data.pnl);
      worstDayPnl = Math.min(worstDayPnl, data.pnl);
    }
  });

  const monthName = monthStart.toLocaleDateString("en-US", { month: "long" });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getColorClass = (pnl: number, tradeCount: number): string => {
    if (tradeCount === 0) {
      return "bg-gray-100 dark:bg-gray-900";
    }

    const isProfit = pnl > 0;
    const isLoss = pnl < 0;

    if (maxAbsPnl === 0) {
      return "bg-gray-100 dark:bg-gray-900";
    }

    const intensity = Math.abs(pnl) / maxAbsPnl;

    if (isProfit) {
      if (intensity > 0.75) return "bg-green-600 text-white";
      if (intensity > 0.5) return "bg-green-500 text-white";
      if (intensity > 0.25) return "bg-green-400 text-white";
      return "bg-green-200 text-foreground";
    } else if (isLoss) {
      if (intensity > 0.75) return "bg-red-600 text-white";
      if (intensity > 0.5) return "bg-red-500 text-white";
      if (intensity > 0.25) return "bg-red-400 text-white";
      return "bg-red-200 text-foreground";
    }

    return "bg-gray-100 dark:bg-gray-900";
  };

  return (
    <div className="space-y-6">
      {/* Calendar Card */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        {/* Header with Month/Year Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-card/80 rounded-lg transition-colors text-foreground"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              {monthName} {currentYear}
            </h2>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-card/80 rounded-lg transition-colors text-foreground"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-muted py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {daysArray.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="aspect-square"></div>;
            }

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const data = dataMap.get(dateStr);
            const colorClass = getColorClass(data?.pnl ?? 0, data?.tradeCount ?? 0);

            return (
              <div
                key={day}
                className={`
                  aspect-square p-2 rounded-lg border border-card-border flex flex-col items-center justify-center gap-0.5
                  cal-cell cursor-pointer ${colorClass}
                `}
              >
                <div className="text-sm font-semibold">{day}</div>
                {data && (
                  <>
                    <div className="text-xs font-medium">
                      {data.pnl > 0 ? "+" : ""}{formatCurrency(data.pnl)}
                    </div>
                    <div className="text-xs text-opacity-75">
                      {data.tradeCount} {data.tradeCount === 1 ? "trade" : "trades"}
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
        {/* Total P&L */}
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Total P&L</div>
          <div className={`text-xl font-bold ${totalMonthPnl > 0 ? "text-green" : totalMonthPnl < 0 ? "text-red" : "text-foreground"}`}>
            {totalMonthPnl > 0 ? "+" : ""}{formatCurrency(totalMonthPnl)}
          </div>
        </div>

        {/* Trading Days */}
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Trading Days</div>
          <div className="text-xl font-bold text-foreground">{tradingDays}</div>
        </div>

        {/* Win Days */}
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Win Days</div>
          <div className="text-xl font-bold text-green">{winDays}</div>
        </div>

        {/* Loss Days */}
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Loss Days</div>
          <div className="text-xl font-bold text-red">{lossDays}</div>
        </div>

        {/* Best Day */}
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Best Day</div>
          <div className={`text-xl font-bold ${bestDayPnl === -Infinity ? "text-muted" : "text-green"}`}>
            {bestDayPnl === -Infinity ? "—" : `+${formatCurrency(bestDayPnl)}`}
          </div>
        </div>

        {/* Worst Day */}
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Worst Day</div>
          <div className={`text-xl font-bold ${worstDayPnl === Infinity ? "text-muted" : "text-red"}`}>
            {worstDayPnl === Infinity ? "—" : formatCurrency(worstDayPnl)}
          </div>
        </div>
      </div>
    </div>
  );
}
