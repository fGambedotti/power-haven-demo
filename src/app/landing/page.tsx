"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import datacentres from "../../../data/datacentres.json";
import demandProfiles from "../../../data/demand_profiles.json";
import generationSites from "../../../data/generation_sites.json";
import marketSignals from "../../../data/market_signals.json";
import AnimatedCounter from "../../components/AnimatedCounter";
import HeroMarketPanel from "../../components/HeroMarketPanel";
import LandingProductUI from "../../components/LandingProductUI";
import Logo from "../../components/Logo";

type AnchorId = "home" | "vision" | "product" | "demo" | "contact";
type DemoTabId = "map" | "market" | "roi";

const navItems: Array<{ id: AnchorId; label: string }> = [
  { id: "home", label: "Home" },
  { id: "vision", label: "Vision" },
  { id: "product", label: "Product" },
  { id: "demo", label: "Demo" },
  { id: "contact", label: "Contact Team" }
];

const teamMembers = [
  {
    name: "Federico Gambedotti",
    role: "Founder",
    credential: "PhD Researcher, UCL Energy Institute. 5 years in UK grid flexibility markets.",
    image: "/images/federico-headshot.svg",
    initials: "FG"
  },
  {
    name: "Margaux Girard",
    role: "Energy Modelling",
    credential: "Market modelling and flexibility strategy for UK datacentre portfolios.",
    image: null,
    initials: "MG"
  },
  {
    name: "Ross Brown",
    role: "Technical Development",
    credential: "Grid-aware software engineering and control integration for site infrastructure.",
    image: null,
    initials: "RB"
  }
];

const statusOptions = [
  "Applied (2+ years queued)",
  "Not yet applied",
  "Active but not flexibility-enrolled"
] as const;

function percentileRange(value: number) {
  return [value * 0.8, value * 1.2] as const;
}

export default function LandingPage() {
  const marketRows = marketSignals.hours;
  const [activeAnchor, setActiveAnchor] = useState<AnchorId>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [demoTab, setDemoTab] = useState<DemoTabId>("map");
  const [liveIndex, setLiveIndex] = useState(marketRows.length - 1);
  const [capacityMw, setCapacityMw] = useState(5);
  const [connectionStatus, setConnectionStatus] = useState<(typeof statusOptions)[number]>(statusOptions[0]);
  const [formState, setFormState] = useState({ name: "", organisation: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveAnchor(entry.target.id as AnchorId);
        });
      },
      { threshold: 0.6, rootMargin: "-15% 0px -20% 0px" }
    );

    sections.forEach((section) => sectionObserver.observe(section));

    const revealTargets = Array.from(document.querySelectorAll(".reveal-on-scroll"));
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );

    revealTargets.forEach((target) => revealObserver.observe(target));

    return () => {
      sectionObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveIndex((index) => (index + 1) % marketRows.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [marketRows.length]);

  const livePoint = marketRows[liveIndex];
  const dispatchWindows = marketRows.filter((row) => row.dynamicContainment > 55).length;
  const avgDc = marketRows.reduce((sum, row) => sum + row.dynamicContainment, 0) / marketRows.length;
  const totalCurtailment = marketRows.reduce((sum, row) => sum + row.curtailmentMwh, 0);
  const dailyDispatchRevenue = marketRows.reduce((sum, row) => sum + row.dynamicContainment * 2 * 0.85, 0);
  const roiAnnual = avgDc * 8760 * capacityMw * 0.85;
  const [roiLow, roiHigh] = percentileRange(roiAnnual);

  const yearsSaved = connectionStatus === statusOptions[0] ? 4.5 : connectionStatus === statusOptions[1] ? 3.2 : 2.1;

  const mapMarkers = (datacentres as Array<{ id: string; name: string; lat: number; lon: number }>).slice(0, 8).map((site, index) => {
    const x = ((site.lon + 8) / 10.5) * 300 + 20;
    const y = (1 - (site.lat - 49.5) / 9.5) * 460 + 20;
    return {
      ...site,
      x,
      y,
      active: index % 2 === 0
    };
  });

  const avgRegionalDemand = useMemo(() => {
    const regions = demandProfiles.regions as Record<string, number[]>;
    return Object.entries(regions)
      .map(([region, profile]) => ({
        region,
        index: profile.reduce((sum, value) => sum + value, 0) / profile.length
      }))
      .sort((a, b) => b.index - a.index)
      .slice(0, 3);
  }, []);

  const renewableCount = (generationSites as Array<{ type: string }>).filter((site) => site.type === "renewable").length;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);

    const params = new URLSearchParams({
      subject: "VoltPilot access request",
      body: `Name: ${formState.name}\nOrganisation: ${formState.organisation}\nEmail: ${formState.email}\n\nMessage:\n${formState.message || "(none)"}`
    });

    window.location.href = `mailto:hello@powerhaven.io?${params.toString()}`;
    setSent(true);
    setSending(false);
  }

  return (
    <div className="bg-[var(--ph-bg)] text-[var(--ph-text)]">
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b border-[var(--ph-divider)] transition-all duration-300 ${
          isScrolled ? "h-[52px] bg-[rgb(6_13_27_/_0.72)] backdrop-blur-xl" : "h-[68px] bg-[rgb(6_13_27_/_0.94)]"
        }`}
      >
        <div className="mx-auto flex h-full w-full max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#home" className="focus-ring inline-flex items-center" aria-label="Power Haven Home">
            <Logo markSize={24} />
          </a>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`focus-ring border-b-2 pb-1 text-sm transition-colors ${
                  activeAnchor === item.id
                    ? "border-[var(--ph-accent)] text-white"
                    : "border-transparent text-[var(--ph-text-soft)] hover:text-white"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a
            href="#contact"
            className="focus-ring hidden rounded-full border border-[var(--ph-accent-magenta)] px-4 py-2 text-sm font-semibold text-[var(--ph-accent-magenta)] transition duration-150 hover:scale-[1.02] hover:bg-[var(--ph-accent-magenta)] hover:text-[var(--ph-bg)] md:inline-flex"
          >
            Request Access
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            className="focus-ring rounded-md border border-[var(--ph-divider)] px-3 py-2 text-[var(--ph-text)] md:hidden"
          >
            <span className="sr-only">Toggle menu</span>
            <span className="space-y-1.5">
              <span className={`block h-0.5 w-5 bg-current transition ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block h-0.5 w-5 bg-current transition ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 bg-current transition ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </header>

      <div className={`fixed inset-0 z-40 bg-[rgb(6_13_27_/_0.6)] transition-opacity md:hidden ${menuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[min(86vw,360px)] border-l border-[var(--ph-divider)] bg-[var(--ph-bg-card)] p-6 transition-transform duration-300 md:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mt-16 flex flex-col gap-3">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setMenuOpen(false)}
              className={`focus-ring rounded-lg px-3 py-3 text-base ${
                activeAnchor === item.id ? "text-[var(--ph-accent)]" : "text-[var(--ph-text)]"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </aside>

      <main>
        <section id="home" className="relative flex min-h-screen items-center border-b border-[var(--ph-divider)] ph-grid-lines">
          <div className="mx-auto grid w-full max-w-[1240px] gap-12 px-4 pb-20 pt-28 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <div className="reveal-on-scroll">
              <p className="ph-eyebrow">VoltPilot by Power Haven</p>
              <h1 className="mt-5 max-w-[16ch] font-display text-[clamp(2.25rem,6vw,4.4rem)] font-bold leading-[1.1] tracking-tight text-white">
                Your data centre connected to the grid. Months, not years.
              </h1>
              <p className="mt-6 max-w-[65ch] text-[1.04rem] leading-[1.65] text-[var(--ph-text-soft)]">
                Power Haven accelerates UK grid connections through Active Network Management pathways while unlocking flexibility
                revenue from batteries, UPS systems, and generators.
              </p>

              <div className="mt-8">
                <a
                  href="#contact"
                  className="focus-ring inline-flex h-11 items-center rounded-full bg-[var(--ph-accent)] px-6 text-sm font-semibold text-[var(--ph-bg)] transition duration-150 hover:scale-[1.02] hover:brightness-105"
                >
                  Request Early Access
                </a>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "🎓 UCL Energy Institute",
                  "✓ NESO-Validated",
                  "⚡ UK Grid Expert"
                ].map((badge) => (
                  <span key={badge} className="rounded-full border border-[var(--ph-divider)] px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-[var(--ph-text-soft)]">
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="reveal-on-scroll">
              <HeroMarketPanel />
            </div>
          </div>
        </section>

        <section id="vision" className="border-b border-[var(--ph-divider)] px-4 py-20 sm:px-6 md:py-[120px] lg:px-8">
          <div className="reveal-on-scroll mx-auto max-w-[760px] text-center">
            <p className="font-display text-[clamp(2.2rem,6vw,4rem)] font-semibold text-[var(--ph-accent-magenta)]">
              £2.4bn
            </p>
            <p className="mt-2 text-sm uppercase tracking-[0.12em] text-[var(--ph-text-soft)]">
              projected UK datacentre queue cost through 2030
            </p>
            <p className="mx-auto mt-7 max-w-[65ch] text-[1.05rem] leading-[1.65] text-[var(--ph-text-soft)]">
              The UK grid is absorbing major demand growth from datacentres, EVs, and electrification. Power Haven exists to turn
              existing infrastructure into faster connections and practical market value.
            </p>
          </div>
        </section>

        <section id="product" className="border-b border-[var(--ph-divider)] px-4 py-20 sm:px-6 md:py-[120px] lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="reveal-on-scroll mb-10 max-w-[65ch]">
              <p className="ph-eyebrow">Product</p>
              <h2 className="mt-4 font-display text-[clamp(2rem,4vw,2.9rem)] font-semibold text-white">VoltPilot</h2>
              <p className="mt-3 max-w-[65ch] text-base leading-[1.65] text-[var(--ph-text-soft)]">
                Interactive grid connection and flexibility orchestration software designed for UK datacentre operators.
              </p>
            </div>

            <div className="reveal-on-scroll">
              <LandingProductUI />
            </div>

            <div className="reveal-on-scroll mt-8 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-4">
              <span className="rounded-full border border-[var(--ph-accent)] px-3 py-1 text-xs text-[var(--ph-accent)]">&lt; 500ms dispatch</span>
              <span className="rounded-full border border-[var(--ph-accent)] px-3 py-1 text-xs text-[var(--ph-accent)]">8 NESO services</span>
              <span className="rounded-full border border-[var(--ph-accent)] px-3 py-1 text-xs text-[var(--ph-accent)]">Full audit trail</span>
            </div>

            <div className="reveal-on-scroll mt-8 flex flex-wrap items-center gap-4">
              <a href="#contact" className="focus-ring rounded-full border border-[var(--ph-accent-magenta)] px-5 py-2 text-sm font-semibold text-[var(--ph-accent-magenta)] hover:bg-[var(--ph-accent-magenta)] hover:text-[var(--ph-bg)]">
                Request Early Access
              </a>
              <p className="text-sm text-[var(--ph-text-soft)]">Operators typically see their first flexibility dispatch within 30 days of onboarding.</p>
            </div>
          </div>
        </section>

        <section id="demo" className="relative border-b border-[var(--ph-divider)] bg-[var(--ph-section-alt)] px-4 py-20 sm:px-6 md:py-[120px] lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="reveal-on-scroll mb-8 max-w-[65ch]">
              <p className="ph-eyebrow">Demo</p>
              <h2 className="mt-3 font-display text-[clamp(2rem,4vw,2.9rem)] font-semibold">Play with live market data.</h2>
              <p className="mt-3 max-w-[65ch] text-base leading-[1.65] text-[var(--ph-text-soft)]">
                Switch views, test assumptions, and see figures update in real time.
              </p>
            </div>

            <div className="reveal-on-scroll rounded-2xl border border-[var(--ph-divider)] bg-[var(--ph-bg-card)] p-4 md:p-6">
              <div className="mb-5 flex flex-wrap gap-3 border-b border-[var(--ph-divider)] pb-4">
                {[
                  { id: "map", label: "UK Grid Map" },
                  { id: "market", label: "Live NESO Market" },
                  { id: "roi", label: "ROI Calculator" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDemoTab(tab.id as DemoTabId)}
                    className={`focus-ring border-b-2 pb-1 text-sm ${demoTab === tab.id ? "border-[var(--ph-accent)] text-white" : "border-transparent text-[var(--ph-text-soft)]"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="transition-opacity duration-300">
                {demoTab === "map" ? (
                  <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                    <div className="rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
                      <svg viewBox="0 0 360 520" className="h-[360px] w-full">
                        <path d="M120 40L180 20L230 35L280 70L300 140L290 210L320 290L295 380L260 450L200 500L140 490L110 430L80 360L70 290L40 220L60 150L85 95L120 40Z" fill="#0D1A2F" stroke="#213654" strokeWidth="2" />
                        {mapMarkers.map((marker) => (
                          <g key={marker.id}>
                            <circle cx={marker.x} cy={marker.y} r="6" fill={marker.active ? "#22D3EE" : "#FF38C7"} />
                            <text x={marker.x + 9} y={marker.y + 4} fill="#7A90AA" fontSize="10">{marker.name.split(" ")[0]}</text>
                          </g>
                        ))}
                      </svg>
                      <div className="mt-2 flex gap-4 text-xs text-[var(--ph-text-soft)]">
                        <span>● ANM Active</span>
                        <span className="text-[var(--ph-accent-magenta)]">● Queue</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-4">
                        <p className="text-sm text-[var(--ph-text-soft)]">Top demand regions</p>
                        <ul className="mt-2 space-y-1 text-sm text-white">
                          {avgRegionalDemand.map((region) => (
                            <li key={region.region}>{region.region}: {region.index.toFixed(2)} demand index</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-4">
                        <p className="text-sm text-[var(--ph-text-soft)]">Generation footprint</p>
                        <p className="mt-1 text-white">{renewableCount} renewable sites in monitored radius</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {demoTab === "market" ? (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <p className="text-[var(--ph-accent)]">🟢 {dispatchWindows} dispatch windows detected today</p>
                      <p className="text-[var(--ph-text-soft)]">Live hour: {livePoint.hour}</p>
                    </div>
                    <div className="h-[280px] rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={marketRows}>
                          <CartesianGrid stroke="rgba(122, 144, 170, 0.2)" strokeDasharray="3 3" />
                          <XAxis dataKey="hour" stroke="#7A90AA" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#7A90AA" tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ background: "#0B1527", border: "1px solid #162234", borderRadius: 8, color: "white" }}
                            formatter={(value: number, key: string) => [
                              `£${value}/MWh`,
                              key === "dynamicContainment" ? "Dynamic Containment" : "Balancing Mechanism"
                            ]}
                          />
                          <Line type="monotone" dataKey="dynamicContainment" stroke="#22D3EE" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="balancingMechanism" stroke="#FF38C7" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <article className="rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--ph-text-soft)]">Total dispatch revenue</p>
                        <p className="mt-1 text-xl font-semibold text-white">£<AnimatedCounter value={dailyDispatchRevenue} /></p>
                      </article>
                      <article className="rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--ph-text-soft)]">Avg DC price</p>
                        <p className="mt-1 text-xl font-semibold text-white">£<AnimatedCounter value={avgDc} decimals={1} />/MWh</p>
                      </article>
                      <article className="rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-3">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--ph-text-soft)]">Curtailment avoided</p>
                        <p className="mt-1 text-xl font-semibold text-white"><AnimatedCounter value={totalCurtailment} /> MWh</p>
                      </article>
                    </div>
                  </div>
                ) : null}

                {demoTab === "roi" ? (
                  <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                    <div className="space-y-5">
                      <label className="block">
                        <span className="mb-2 block text-sm text-[var(--ph-text-soft)]">Flexible capacity (MW): {capacityMw}</span>
                        <input
                          className="w-full accent-[var(--ph-accent)]"
                          type="range"
                          min={1}
                          max={20}
                          value={capacityMw}
                          onChange={(event) => setCapacityMw(Number(event.target.value))}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm text-[var(--ph-text-soft)]">Connection status</span>
                        <select
                          value={connectionStatus}
                          onChange={(event) => setConnectionStatus(event.target.value as (typeof statusOptions)[number])}
                          className="focus-ring h-11 w-full rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] px-3 text-[var(--ph-text)]"
                        >
                          {statusOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="space-y-3 rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-5">
                      <p className="text-sm text-[var(--ph-text-soft)]">Estimated annual flexibility revenue</p>
                      <p className="font-display text-2xl text-white">£{Math.round(roiLow).toLocaleString("en-GB")} - £{Math.round(roiHigh).toLocaleString("en-GB")}/year</p>
                      <p className="text-sm text-[var(--ph-text-soft)]">Connection acceleration: up to {yearsSaved.toFixed(1)} years saved</p>
                      <p className="text-sm text-[var(--ph-text-soft)]">VoltPilot pilot scope: 3-month pilot on {capacityMw}MW starting with Dynamic Containment.</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/demo-mode" target="_blank" rel="noopener noreferrer" className="focus-ring rounded-full bg-[var(--ph-accent)] px-5 py-2 text-sm font-semibold text-[var(--ph-bg)]">
                  Launch Full Demo →
                </Link>
                <a href="#contact" className="focus-ring rounded-full border border-[var(--ph-accent-magenta)] px-5 py-2 text-sm font-semibold text-[var(--ph-accent-magenta)]">
                  Book a Walkthrough →
                </a>
              </div>
            </div>

            <div className="reveal-on-scroll mt-8 flex flex-wrap items-center gap-4">
              <a href="#contact" className="focus-ring rounded-full border border-[var(--ph-accent)] px-5 py-2 text-sm font-semibold text-[var(--ph-accent)] hover:bg-[var(--ph-accent)] hover:text-[var(--ph-bg)]">
                Request Early Access
              </a>
              <p className="text-sm text-[var(--ph-text-soft)]">Interactive demo numbers update in real time so visitors can explore before booking.</p>
            </div>
          </div>
        </section>

        <section id="contact" className="border-b border-[var(--ph-divider)] px-4 py-20 sm:px-6 md:py-[120px] lg:px-8">
          <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[1fr_1fr]">
            <div className="reveal-on-scroll space-y-4">
              <p className="ph-eyebrow">Contact Team</p>
              <h2 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-semibold">Built by people in the market.</h2>

              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <article key={member.name} className="flex items-start gap-3 rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-surface)] p-4">
                    {member.image ? (
                      <Image src={member.image} alt={member.name} width={56} height={56} className="h-14 w-14 rounded-full" />
                    ) : (
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ph-accent)] to-[var(--ph-accent-magenta)] font-semibold text-[var(--ph-bg)]">
                        {member.initials}
                      </span>
                    )}
                    <div>
                      <h3 className="font-semibold text-white">{member.name} — {member.role}</h3>
                      <p className="mt-1 max-w-[65ch] text-sm text-[var(--ph-text-soft)]">{member.credential}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="reveal-on-scroll rounded-xl border border-[var(--ph-divider)] bg-[var(--ph-bg-card)] p-6">
              <h3 className="font-display text-2xl font-semibold text-white">Request access</h3>
              <div className="mt-5 space-y-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  className="focus-ring h-11 w-full rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] px-3 text-[var(--ph-text)]"
                  required
                />
                <input
                  type="text"
                  placeholder="Organisation"
                  value={formState.organisation}
                  onChange={(event) => setFormState((prev) => ({ ...prev, organisation: event.target.value }))}
                  className="focus-ring h-11 w-full rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] px-3 text-[var(--ph-text)]"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  className="focus-ring h-11 w-full rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] px-3 text-[var(--ph-text)]"
                  required
                />
                <textarea
                  rows={4}
                  placeholder="Message (optional)"
                  value={formState.message}
                  onChange={(event) => setFormState((prev) => ({ ...prev, message: event.target.value }))}
                  className="focus-ring w-full rounded-lg border border-[var(--ph-divider)] bg-[var(--ph-surface)] px-3 py-2 text-[var(--ph-text)]"
                />
              </div>

              <button
                type="submit"
                disabled={sending || sent}
                className="focus-ring mt-5 inline-flex h-11 items-center rounded-full bg-[var(--ph-accent-magenta)] px-6 text-sm font-semibold text-[var(--ph-bg)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {sent ? "Message sent ✓" : sending ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="bg-[#040A14] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-8 md:grid-cols-3">
          <div>
            <Logo markSize={20} />
            <p className="mt-2 max-w-[65ch] text-sm text-[var(--ph-text-soft)]">Interactive GitHub-friendly website: edit data files, components, and copy in one place.</p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-[var(--ph-text-soft)]">
            {navItems.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="focus-ring hover:text-white">{item.label}</a>
            ))}
          </div>
          <div className="text-sm text-[var(--ph-text-soft)]">
            <a href="mailto:hello@powerhaven.io" className="focus-ring hover:text-white">hello@powerhaven.io</a>
            <p className="mt-2 text-xs">© 2026 Power Haven Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
