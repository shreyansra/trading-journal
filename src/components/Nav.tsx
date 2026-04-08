"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const links = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/trades", label: "Trades", icon: "📋" },
  { href: "/add", label: "Add Trade", icon: "➕" },
];

export default function Nav() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <nav className="bg-card border-b border-card-border px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold text-foreground">
          TradeJournal
        </Link>
        <div className="flex gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground hover:bg-background"
              }`}
            >
              <span className="mr-1.5">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-md hover:bg-background text-muted hover:text-foreground transition-colors"
        aria-label="Toggle theme"
      >
        {dark ? "☀️" : "🌙"}
      </button>
    </nav>
  );
}
