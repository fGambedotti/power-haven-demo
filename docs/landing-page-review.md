# Power Haven Landing Page Review Brief

## Scope
This document describes the current `/landing` page implementation in **Power Haven Demo** for design review.

## Page URL
- Local route: `/landing`

## Overall Product Positioning
- Product: Power Haven platform for grid flexibility dispatch
- Core message: operational control layer between electricity markets and flexible power assets
- Primary audience signals in copy: operators, traders, infrastructure investors

## Global Shell and Frame
- Sticky header stays visible while scrolling
- Header includes:
  - Brand mark (gradient square)
  - Brand text: `Power Haven`
  - Subtitle: `NESO Flex Dispatch Simulation`
  - Navigation links: `Demo`, `Economics`, `Trust`, `Landing`
- Background style across the app shell:
  - Light mode only (`color-scheme: light`)
  - Layered radial + linear gradient
  - Subtle grid texture overlay (`bg-grid`)

## Typography
- Body font: `Manrope`
- Display font: `Space Grotesk`
- Hierarchy pattern:
  - Display font for major headings
  - Small uppercase micro-labels with increased letter spacing for section tags
  - Body copy in slate tones, medium weight

## Color and Surface Language
- Primary accent family: cyan/blue
- Hero surface: dark slate with luminous cyan/blue glow effects
- Card/panel surfaces: white to very light blue gradient
- Border style: soft slate border (`rgba(148,163,184,0.28)` baseline)
- Shadow style: medium-soft elevation (`0 12px 28px rgba(15,23,42,0.08)` for panels)

## Layout System
- Main content max width: `1240px`
- Header container max width: `1440px`
- Desktop rhythm:
  - Vertical spacing between major sections: `gap-10` to `gap-14`
  - Section corner treatment: rounded cards (`18px` to `28px`)
- Responsive behavior:
  - Mobile-first stacked layout
  - Hero becomes two-column on `lg`
  - Value cards become 3-column on `lg`
  - CTA area stacks on small screens and shifts to row alignment at `sm`

## Section-by-Section Content

## 1) Hero Section
- Visual format:
  - Large rounded dark panel
  - Two blurred gradient orbs (top-left and bottom-right) for atmosphere
  - Two-column grid on large screens
- Left column content:
  - Eyebrow: `Power Haven Platform`
  - H1: `The operating layer between electricity markets and flexible power assets.`
  - Supporting copy: `Power Haven helps operators react to grid volatility in seconds, not days, with simulation-backed dispatch and investor-ready reporting.`
  - Primary CTA: `Launch live demo` -> `/demo-mode`
  - Secondary CTA: `Explore unit economics` -> `/roi-studio`
- Right column content (proof cards):
  - `< 250ms` — `Portfolio response time`
  - `12,000+` — `Dispatch scenarios simulated`
  - `8` — `Revenue pathways modeled`

## 2) Value Pillars Section
- Format:
  - 3 cards in a responsive grid
  - Shared `panel` style for consistency with product UI
- Pillars:
  - `See grid stress before it hits`
  - `Orchestrate assets in real time`
  - `Prove outcomes to investors`
- Tone: concise, outcome-first, operationally concrete

## 3) How It Works Section
- Format:
  - Split panel with gradient intro block (left) and step cards (right)
  - Left acts as narrative anchor; right provides process detail
- Intro content:
  - Eyebrow: `How it works`
  - Heading: `From telemetry to validated dispatch in one control loop.`
  - Supporting line references target users and value lens
- Process steps:
  - `Step 01 — Ingest`
  - `Step 02 — Decide`
  - `Step 03 — Execute`
- Each step has a short operational description focused on real-time decisioning and auditability

## 4) Final Conversion Section
- Format:
  - Wide panel with left-side message + right-side CTA group
- Copy:
  - Eyebrow: `Ready to deploy`
  - Heading: `Turn flexibility into a repeatable revenue engine.`
  - Supporting line: guidance to validate projects via demo workflows
- CTA buttons:
  - `Compare scenarios` -> `/scenarios` (solid dark button)
  - `View portfolio model` -> `/portfolio` (outlined button)

## Component and Interaction Notes
- Buttons include hover transitions (`transition` classes) but no complex motion choreography
- Hero glow elements are decorative only (`pointer-events-none`)
- No form fields or input capture on this page version
- Navigation and CTA destinations are internal product routes

## Design Intent Summary
- The page is intentionally high-contrast in the hero to create first-impression weight.
- Mid-page cards shift into clean, analytical surfaces to match a B2B infrastructure product tone.
- Messaging arc follows: **positioning -> proof -> capabilities -> process -> conversion**.

## Suggested Design Review Checklist
- Is the hero tone aligned with brand confidence (not over-hyped)?
- Are proof metrics believable and visually prioritized correctly?
- Do section transitions feel coherent from dark hero to light analytical cards?
- Is CTA hierarchy clear at first glance (primary vs secondary)?
- Should we add social proof logos, testimonials, or client evidence above the final CTA?
- Is mobile spacing comfortable for text-heavy cards?

## Source References (Implementation)
- Landing page source: `src/app/landing/page.tsx`
- Global styles: `src/app/globals.css`
- App shell/header: `src/app/layout.tsx`
