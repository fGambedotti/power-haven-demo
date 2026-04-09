import type { SVGProps } from "react";

function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="ph-logo-gradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#FF38C7" />
        </linearGradient>
      </defs>
      <path d="M32 8L51.8 19.4V42.6L32 54L12.2 42.6V19.4L32 8Z" stroke="url(#ph-logo-gradient)" strokeOpacity="0.6" strokeWidth="3" />
      <path d="M32 18L43.3 24.5V37.5L32 44L20.7 37.5V24.5L32 18Z" fill="url(#ph-logo-gradient)" />
      <path d="M52 20L60 15" stroke="url(#ph-logo-gradient)" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 32H3" stroke="url(#ph-logo-gradient)" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
      <path d="M43.7 44.8L48.5 53" stroke="url(#ph-logo-gradient)" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ markSize = 24, compact = false }: { markSize?: number; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark style={{ width: markSize, height: markSize }} />
      {!compact ? (
        <span className="font-display text-[1.1rem] font-semibold tracking-tight leading-none">
          <span className="text-white">Power</span> <span className="text-[var(--ph-accent-magenta)]">Haven</span>
        </span>
      ) : null}
    </span>
  );
}
