# SteelSpec

Structural steel takeoff — automated. Upload an engineer's IFC or DWG/DXF file, get a steel schedule, connection report, and fabrication drawings as PDF.

## Stack

- React + TypeScript + Vite
- React Router (landing page at `/`, dashboard at `/dashboard`)
- lucide-react for icons
- Deployed on Vercel, auto-deploy from `main`

## Local development

```
npm install
npm run dev
```

## Deploying changes

Same workflow as GoodFi:

```
git add -A
git commit -m "your message"
git push origin main
```

Vercel picks up the push and redeploys automatically.

**Do not use Vercel's "Redeploy" on an old build** — it reverts production to the pre-fix code. Always push a new commit.

## Project structure

```
src/
  pages/
    LandingPage.tsx   — public marketing site
    Dashboard.tsx     — business dashboard (projects, uploads, billing)
  lib/
    theme.ts          — shared colour tokens (rust/charcoal palette)
  App.tsx             — routing
  main.tsx            — entry point
```

## Roadmap notes

- Payment UI is built with a placeholder for BlinkPay (pending BNZ open banking approval). Card payments are UI-only mockups — no live payment processing yet.
- DXF/IFC parsing backend (Python) lives separately — not yet wired into this frontend.
