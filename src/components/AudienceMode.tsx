"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";

export type AudienceMode = "Investor" | "Operator" | "Technical";

interface AudienceModeContextValue {
  mode: AudienceMode;
  setMode: (mode: AudienceMode) => void;
}

const AudienceModeContext = createContext<AudienceModeContextValue | null>(null);
const STORAGE_KEY = "voltPilotAudienceMode";

export function AudienceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AudienceMode>("Investor");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as AudienceMode | null;
    if (stored === "Investor" || stored === "Operator" || stored === "Technical") {
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode }), [mode]);
  return <AudienceModeContext.Provider value={value}>{children}</AudienceModeContext.Provider>;
}

export function useAudienceMode() {
  const ctx = useContext(AudienceModeContext);
  if (!ctx) {
    throw new Error("useAudienceMode must be used within AudienceModeProvider");
  }
  return ctx;
}

export function AudienceModeToggle() {
  const { mode, setMode } = useAudienceMode();
  const options: AudienceMode[] = ["Investor", "Operator", "Technical"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-1">
      <div className="flex items-center gap-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              mode === option ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

