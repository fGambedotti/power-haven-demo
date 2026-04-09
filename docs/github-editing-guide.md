# Power Haven Website Editing Guide

## Quick start
1. Run `npm install`
2. Run `npm run dev`
3. Open `http://localhost:3000/landing`

## Main files to edit
- Landing page: `src/app/landing/page.tsx`
- Interactive demo page: `src/app/demo-mode/page.tsx`
- Brand logo: `src/components/Logo.tsx`
- Hero market panel: `src/components/HeroMarketPanel.tsx`
- Product UI mockup: `src/components/LandingProductUI.tsx`
- Shared styles/tokens: `src/app/globals.css`
- Contact endpoint: `src/app/api/contact/route.ts`

## Real-time data source
- NESO market signals: `data/market_signals.json`
- Datacentre list: `data/datacentres.json`
- Demand profiles: `data/demand_profiles.json`
- Generation sites: `data/generation_sites.json`

Edits to these JSON files update the charts and metrics automatically.
