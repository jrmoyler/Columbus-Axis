# The Columbus Axis

**Gamified RPG · TCG · 3D City Builder** based on the real residential, commercial, office, and industrial market of Central Ohio.

> Become the King of the Buckeye State. Collect property cards, place 3D buildings on a living map of Columbus, earn **Axis Coin**, and let your ownership and decisions drive the prediction market — not free sliders.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Play loop

1. Start with **1,000 Axis Coin** and a starter hand of property cards.
2. Select a card → click the matching neighborhood tile on the **3D map** → a building is placed, coin is spent, abilities resolve.
3. **Collect Rent** each cycle. **Draw** more cards (40 coin, once per cycle).
4. Open **Axis Market** — fair values, floors, and shocks are driven by the properties you own.
5. Survive the **cycle-6 rate shock**, then push **Dominion to 60%** to win.

Empire state autosaves in `localStorage`.

## What ships in this build

- **Axis Coin** — purchases, rents, and market stakes.
- **16 property cards** — real Columbus neighborhood / submarket names (`src/data/properties.ts`).
- **3D Central Ohio map** — Three.js (`src/components/OhioMap3D.tsx`). Drag to orbit, click tiles to place.
- **Ability resolution** — market bias, rent multipliers, industrial synergy, Intel floor, inventory surge, and more.
- **Axis Market mini-game** — buy/sell YES and NO; holdings bias the tape.
- **Persistence** — versioned local save, restored on Continue.
- **Win / lose** — Dominion ≥ 60% after surviving the rate shock, or receivership if the books go to zero.

### Explicit v1 cuts

- Full photogrammetry / real MLS feeds
- Multiplayer / ranked ladder
- Deep RPG story / dialogue
- Real-money or blockchain Axis Coin
- Every single parcel in Franklin County (curated high-flavor set only)

## Project structure

```
src/
  App.tsx                    # Shell, economy, hand, abilities, win/lose
  AxisMarketColumbus.tsx     # Prediction market (influence-driven)
  components/OhioMap3D.tsx   # Three.js Central Ohio map + buildings
  data/properties.ts         # Card + tile definitions
  data/market.ts             # Tape, positions, ticks
  lib/empire.ts              # Dominion, rent, ability resolution
  lib/save.ts                # localStorage persistence
```

## Design identity

- Dark carbon ground (`#0A0A0A`)
- Axis burgundy accent + Collective Amber Gold on cash
- Space Grotesk + IBM Plex Mono
- Real neighborhood names, fictional prices & probabilities

## Deploy

This is a Vite SPA. Vercel should detect the framework automatically (`vercel.json` pins `framework: vite`, `outputDirectory: dist`). Build command is `npm run build` (`tsc -b && vite build`).

---

Built as a Collective AI / Hataalii prototype.  
Neighborhood and submarket names are real; every dollar figure and probability is fictional.
