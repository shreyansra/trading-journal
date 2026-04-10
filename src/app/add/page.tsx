"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTrades } from "@/lib/TradeContext";

export default function AddTradePage() {
  const router = useRouter();
  const { setShowTradeModal, setEditingTrade } = useTrades();

  useEffect(() => {
    setEditingTrade(null);
    setShowTradeModal(true);
    router.push("/");
  }, [router, setShowTradeModal, setEditingTrade]);

  return null;
}
