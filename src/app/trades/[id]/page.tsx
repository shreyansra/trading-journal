"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Trade } from "@/lib/types";
import TradeForm from "@/components/TradeForm";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function TradeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("trades").select("*").eq("id", id).single();
      setTrade(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!trade) {
    return <div className="py-20 text-center text-muted">Trade not found</div>;
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Edit Trade</h1>
        <TradeForm trade={trade} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {trade.ticker}{" "}
          <span
            className={`text-sm px-2 py-0.5 rounded ${
              trade.direction === "long"
                ? "bg-green/15 text-green"
                : "bg-red/15 text-red"
            }`}
          >
            {trade.direction.toUpperCase()}
          </span>
        </h1>
        <button
          onClick={() => setEditing(true)}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
        >
          Edit Trade
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DetailCard label="Entry Price" value={formatCurrency(trade.entry_price)} />
        <DetailCard
          label="Exit Price"
          value={trade.exit_price !== null ? formatCurrency(trade.exit_price) : "Open"}
        />
        <DetailCard label="Quantity" value={trade.quantity.toString()} />
        <DetailCard
          label="P&L"
          value={trade.pnl !== null ? formatCurrency(trade.pnl) : "Open"}
          color={
            trade.pnl === null ? "text-muted" : trade.pnl > 0 ? "text-green" : "text-red"
          }
        />
        <DetailCard label="Entry Date" value={formatDate(trade.entry_date)} />
        <DetailCard
          label="Exit Date"
          value={trade.exit_date ? formatDate(trade.exit_date) : "—"}
        />
        <DetailCard label="Fees" value={formatCurrency(trade.fees)} />
      </div>

      {trade.strategy_tags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {trade.strategy_tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {trade.notes && (
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">Notes</h3>
          <div className="bg-card border border-card-border rounded-xl p-4 text-sm whitespace-pre-wrap">
            {trade.notes}
          </div>
        </div>
      )}

      {trade.screenshot_urls.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">Screenshots</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trade.screenshot_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`Screenshot ${i + 1}`}
                  className="rounded-xl border border-card-border w-full hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-lg font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}
