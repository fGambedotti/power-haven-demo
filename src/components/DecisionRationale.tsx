import clsx from "clsx";

export interface RationaleRule {
  label: string;
  value: string;
  status: "pass" | "warn" | "block";
  reason?: string;
}

export default function DecisionRationale({
  title,
  subtitle,
  rules,
  outcome
}: {
  title: string;
  subtitle: string;
  rules: RationaleRule[];
  outcome: string;
}) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Decision Rationale</p>
          <p className="mt-1 font-display text-lg font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
          {outcome}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {rules.map((rule) => (
          <div key={`${rule.label}-${rule.value}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-800">{rule.label}</p>
                {rule.reason ? <p className="text-[11px] text-slate-500">{rule.reason}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">{rule.value}</span>
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
                    rule.status === "pass" && "bg-emerald-100 text-emerald-700",
                    rule.status === "warn" && "bg-amber-100 text-amber-700",
                    rule.status === "block" && "bg-rose-100 text-rose-700"
                  )}
                >
                  {rule.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
