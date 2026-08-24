# The Columbus Axis

**Gamified RPG · TCG · 3D City Builder** based on the real residential, commercial, office, and industrial market of Central Ohio.

> Become the King of the Buckeye State. Collect property cards, place 3D buildings on a living map of Columbus, earn **Axis Coin**, and let your ownership and decisions drive the prediction market — not free sliders.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## What is in this prototype (v0.1)

### Core loop
1. Start with **1,000 Axis Coin** and a starter hand of property cards.
2. Select a card → click the matching neighborhood tile on the **3D map** → a building is placed, coin is spent, ownership is claimed.
3. Card **abilities resolve** (bias, rent multipliers, synergies, one-shots).
4. **Collect Rent** each cycle.
5. Open **Axis Market** (the original Columbus prediction-market simulator) — fair values, agent pressure, and events are now influenced by the properties you own and the abilities you triggered.
6. Draw more cards, expand your holdings, raise Dominion % toward controlling Central Ohio.

### Key systems
- **Axis Coin** — single in-game currency for purchases, rents, and market stakes.
- **Property cards** — data-driven TCG layer (`src/data/properties.ts`) with real Columbus neighborhood / submarket names.
- **3D Ohio map** — Three.js scene (`src/components/OhioMap3D.tsx`). Drag to orbit, click tiles to place.
- **Ability resolution** — real effects (temporary market bias, rent multipliers, industrial synergy, Intel floor, etc.).
- **Axis Market mini-game** — your original simulator, now receives an `influence` prop so ownership drives the tape instead of free agent-mix sliders.

### Explicit v1 cuts
- Full photogrammetry / real MLS feeds
- Multiplayer / ranked ladder
- Deep RPG story / dialogue
- Real-money or blockchain Axis Coin
- Every single parcel in Franklin County (curated high-flavor set only)

## Project structure

```
src/
  App.tsx                 # Shell, economy, hand, abilities, market modal
  AxisMarketColumbus.tsx  # Prediction market (influence-driven)
  components/
    OhioMap3D.tsx         # Three.js Central Ohio map + buildings
  data/
    properties.ts         # Card definitions
  App.css / index.css
```

## Design identity

- Dark carbon ground (`#0A0A0A`)
- Axis burgundy accent + Collective Amber Gold on cash
- Space Grotesk
- Real neighborhood names, fictional prices & probabilities

## Next steps (suggested)

1. Persist empire state (localStorage / IndexedDB)
2. Expand the card pool and ability catalog
3. Richer 3D building library (instanced meshes per subtype)
4. Market events that can be triggered by ownership thresholds
5. Win screen when Dominion ≥ 60 % and a stress-test is survived

---

Built as a Collective AI / Hataalii prototype.  
Neighborhood and submarket names are real; every dollar figure and probability is fictional.
