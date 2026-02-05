import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Power Haven | Flex Dispatch Demo",
  description: "Investor-grade interactive demo for UK grid flexibility dispatch."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-mist">
          <header className="border-b border-slate/10 bg-white">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
              <div>
                <p className="font-display text-xl font-semibold text-ink">Power Haven</p>
                <p className="text-xs uppercase tracking-[0.3em] text-slate/60">Flex Dispatch Demo</p>
              </div>
              <nav className="flex items-center gap-4 text-sm font-medium text-slate">
                <a className="rounded-full px-4 py-2 transition hover:bg-mist" href="/">Overview</a>
                <a className="rounded-full px-4 py-2 transition hover:bg-mist" href="/revenue">Revenue & Reporting</a>
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
