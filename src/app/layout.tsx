import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TradeProvider } from "@/lib/TradeContext";
import Shell from "@/components/Shell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My PnL",
  description: "Track, analyze, and improve your trading performance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <TradeProvider>
          <Shell>{children}</Shell>
        </TradeProvider>
      </body>
    </html>
  );
}
