import Dashboard from "../components/Dashboard";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1440px] px-4 py-6 text-sm text-slate-600">Loading dashboard...</div>}>
      <Dashboard />
    </Suspense>
  );
}
