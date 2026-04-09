"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AudienceModeToggle } from "./AudienceMode";
import Logo from "./Logo";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/landing";
  const isStandaloneDemo = pathname.startsWith("/demo-mode");

  if (isLanding || isStandaloneDemo) {
    return <div className="min-h-screen bg-grid">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-grid">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-slate-900 px-2 py-1">
              <Logo markSize={20} />
            </span>
          </div>
          <div className="flex items-center gap-3">
            <AudienceModeToggle />
            <nav className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <a className="rounded-lg px-4 py-2 transition hover:bg-slate-900 hover:text-white" href="/demo-mode">Demo</a>
              <a className="rounded-lg px-4 py-2 transition hover:bg-slate-900 hover:text-white" href="/roi-studio">Economics</a>
              <a className="rounded-lg px-4 py-2 transition hover:bg-slate-900 hover:text-white" href="/compliance">Trust</a>
              <a className="rounded-lg px-4 py-2 transition hover:bg-slate-900 hover:text-white" href="/landing">Landing</a>
            </nav>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
