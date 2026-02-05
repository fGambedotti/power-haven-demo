# Power Haven Flex Dispatch Demo

Investor-grade interactive demo showing how a UK system operator dispatch signal can route flexibility to datacentre batteries while enforcing backup reserve protection. This is a simulation-only experience.

## Install & Run

```bash
npm install
npm run dev
```

Build + test:

```bash
npm run build
npm run test
```

## Architecture Summary

- **Next.js App Router + TypeScript** for UI and routing.
- **MapLibre GL JS** renders the interactive UK map, demand heatmap, transmission corridors, and asset markers.
- **Simulation engine** lives in `src/lib/simEngine.ts` and runs deterministically on the client.
- **Demo datasets** live in `/data` as JSON/GeoJSON.
- **Reporting** uses Recharts on `/revenue` with CSV export.

## What Is Simulated vs Real

- **Simulated:** dispatch instructions, revenue rates, battery response dynamics, demand intensity, and grid events.
- **Real-world analogs:** NESO dispatch flow, reserve constraints, and datacentre flexibility behavior.
- **Not real:** geographic accuracy, operational telemetry, live market prices, or control systems.

## Key Files

- `src/components/Dashboard.tsx` — main UI, KPIs, map, and control panel.
- `src/components/MapView.tsx` — MapLibre layers and interaction.
- `src/lib/simEngine.ts` — deterministic tick/update logic and constraints.
- `src/app/revenue/page.tsx` — revenue chart + CSV export.
- `data/` — demo datasets.

## Disclaimer

Illustrative simulation for demonstration — not an operational control system.
