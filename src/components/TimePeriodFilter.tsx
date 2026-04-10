"use client";

const periods = [
  "Today",
  "Yesterday",
  "This wk.",
  "Last wk.",
  "This mo.",
  "Last mo.",
  "Last 3 mo.",
  "This yr.",
  "Last yr.",
  "Reset",
];

export default function TimePeriodFilter() {
  // Period filtering is visual for now; can be wired to context later
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto">
      {periods.map((p) => (
        <button
          key={p}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
            p === "Reset"
              ? "text-muted hover:text-foreground"
              : "text-muted hover:text-foreground hover:bg-card border border-transparent hover:border-card-border"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
