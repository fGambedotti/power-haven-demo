import "./globals.css";
import type { ReactNode } from "react";
import { Manrope, Space_Grotesk } from "next/font/google";

const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body" });
const displayFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata = {
  title: "Power Haven | Flex Dispatch Demo",
  description: "Investor-grade interactive demo for UK grid flexibility dispatch."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <div className="min-h-screen bg-grid">
          <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 shadow-lg" />
                <div>
                  <p className="font-display text-xl font-semibold tracking-tight text-slate-900">Power Haven</p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">NESO Flex Dispatch Simulation</p>
                </div>
              </div>
              <nav className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <a className="rounded-lg px-4 py-2 transition hover:bg-slate-900 hover:text-white" href="/">Overview</a>
                <a className="rounded-lg px-4 py-2 transition hover:bg-slate-900 hover:text-white" href="/shadow-mode">Shadow Mode</a>
                <a className="rounded-lg px-4 py-2 transition hover:bg-slate-900 hover:text-white" href="/revenue">Revenue & Reporting</a>
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
