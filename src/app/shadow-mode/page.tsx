"use client";

export default function ShadowModePage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="panel p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Shadow Mode</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-900">
          Datacentre demand observability and forecast pre-notification
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">
          Shadow Mode monitors site power demand, learns operating patterns, forecasts near-term load, and identifies
          flexible windows that can be pre-notified to NESO before live dispatch integration.
        </p>
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="metric-tile p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Mode status</p>
            <p className="mt-2 font-display text-2xl font-semibold text-slate-900">Monitoring</p>
            <p className="mt-1 text-xs text-slate-500">Read-only / non-invasive</p>
          </div>
          <div className="metric-tile p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Data source</p>
            <p className="mt-2 font-display text-2xl font-semibold text-slate-900">Synthetic Feed</p>
            <p className="mt-1 text-xs text-slate-500">Demo placeholder for meter stream</p>
          </div>
          <div className="metric-tile p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Next step</p>
            <p className="mt-2 font-display text-2xl font-semibold text-slate-900">Forecast + Flex Windows</p>
            <p className="mt-1 text-xs text-slate-500">Will be added in next commit</p>
          </div>
        </div>
      </section>
    </main>
  );
}
