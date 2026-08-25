// Axis Market — the Columbus prediction-market simulator.
// Fair values, agent pressure and events are driven by the properties the
// player owns (the `influence` prop), not by free-floating sliders.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type MarketSector =
  | "Residential"
  | "Office"
  | "Retail"
  | "Industrial"
  | "Mixed-Use";

export type MarketCategory = "residential" | "commercial";

/** Everything the empire layer pushes down into the tape. */
export interface MarketInfluence {
  /** Direct cent bias applied to a single market's fair value. */
  cents: Record<string, number>;
  /** Cent bias applied to every market in a sector. */
  sectorCents: Partial<Record<MarketSector, number>>;
  /** Cent bias applied to every market in a category. */
  categoryCents: Partial<Record<MarketCategory, number>>;
  /** Hard price floors, in cents, keyed by market id. */
  floors: Record<string, number>;
  /** 0–1. Raises agent conviction: the tape tracks fair value harder. */
  dominion: number;
  /** Rickenbacker passive — Logistics Boom pays double Axis Coin. */
  logisticsDouble: boolean;
}

export const EMPTY_INFLUENCE: MarketInfluence = {
  cents: {},
  sectorCents: {},
  categoryCents: {},
  floors: {},
  dominion: 0,
  logisticsDouble: false,
};

interface MarketDef {
  id: string;
  question: string;
  category: MarketCategory;
  sector: MarketSector;
  baseFair: number;
}

const MARKET_DEFS: MarketDef[] = [
  {
    id: "short-north-inventory",
    question: "Short North active listings fall below 90 before the next cycle close",
    category: "residential",
    sector: "Residential",
    baseFair: 46,
  },
  {
    id: "metro-median-500k",
    question: "Franklin County median sale price prints above $500K",
    category: "residential",
    sector: "Residential",
    baseFair: 38,
  },
  {
    id: "clintonville-dom",
    question: "Clintonville median days-on-market drops under 12",
    category: "residential",
    sector: "Residential",
    baseFair: 52,
  },
  {
    id: "ua-teardown",
    question: "Upper Arlington teardown permits set a new quarterly record",
    category: "residential",
    sector: "Residential",
    baseFair: 41,
  },
  {
    id: "intel-timeline",
    question: "New Albany fab hits its published first-silicon window",
    category: "commercial",
    sector: "Office",
    baseFair: 44,
  },
  {
    id: "office-vacancy-20",
    question: "Downtown office vacancy closes under 20%",
    category: "commercial",
    sector: "Office",
    baseFair: 31,
  },
  {
    id: "conversion-permits",
    question: "Five or more office-to-residential conversion permits are filed",
    category: "commercial",
    sector: "Office",
    baseFair: 49,
  },
  {
    id: "retail-foot-traffic",
    question: "Polaris holiday foot traffic beats the prior year",
    category: "commercial",
    sector: "Retail",
    baseFair: 57,
  },
  {
    id: "bridge-street-retail",
    question: "Dublin Bridge Street asking retail rents clear $34/sf",
    category: "commercial",
    sector: "Retail",
    baseFair: 43,
  },
  {
    id: "rickenbacker-absorption",
    question: "Rickenbacker posts 1M+ sf of positive industrial absorption",
    category: "commercial",
    sector: "Industrial",
    baseFair: 55,
  },
  {
    id: "groveport-spec",
    question: "A new Groveport spec warehouse breaks ground",
    category: "commercial",
    sector: "Industrial",
    baseFair: 61,
  },
  {
    id: "arena-mixed-lease",
    question: "Arena District mixed-use reaches 95% leased",
    category: "commercial",
    sector: "Mixed-Use",
    baseFair: 47,
  },
];

interface MarketState {
  price: number;
  prev: number;
  shares: number;
  basis: number;
}

interface EventDef {
  id: string;
  headline: string;
  sector: MarketSector | "All";
  swing: number;
}

const EVENTS: EventDef[] = [
  { id: "logistics-boom", headline: "Logistics Boom — a 3PL signs 900K sf on the south side", sector: "Industrial", swing: 9 },
  { id: "rate-cut", headline: "Rate cut priced in — residential bid firms up", sector: "Residential", swing: 7 },
  { id: "sublease-wave", headline: "Sublease wave hits the CBD tower stack", sector: "Office", swing: -8 },
  { id: "anchor-exit", headline: "A national anchor exits a Polaris box", sector: "Retail", swing: -7 },
  { id: "intel-headline", headline: "Fab equipment move-in photos leak — Office sentiment jumps", sector: "Office", swing: 8 },
  { id: "inventory-surge", headline: "Inventory surge: new listings up 22% week over week", sector: "Residential", swing: -6 },
  { id: "mixed-lease", headline: "Two floors of a mixed-use block go under LOI", sector: "Mixed-Use", swing: 6 },
  { id: "credit-freeze", headline: "Regional lender tightens construction credit", sector: "All", swing: -5 },
];

const TICK_MS = 900;
const EVENT_EVERY = 14;
const TRADE_QTY = 10;

const clampPrice = (n: number) => Math.max(2, Math.min(98, n));
const centsToCoin = (cents: number, qty: number) => (cents / 100) * qty;

interface AxisMarketColumbusProps {
  influence: MarketInfluence;
  coin: number;
  onCoinDelta: (delta: number, reason: string) => void;
  onClose: () => void;
}

export default function AxisMarketColumbus({
  influence,
  coin,
  onCoinDelta,
  onClose,
}: AxisMarketColumbusProps) {
  const [markets, setMarkets] = useState<Record<string, MarketState>>(() => {
    const initial: Record<string, MarketState> = {};
    for (const def of MARKET_DEFS) {
      initial[def.id] = { price: def.baseFair, prev: def.baseFair, shares: 0, basis: 0 };
    }
    return initial;
  });
  const [tape, setTape] = useState<string[]>([
    "Axis Market open. Your holdings are already leaning on the tape.",
  ]);
  const [tick, setTick] = useState(0);
  // Event drift is never rendered directly, so it lives in a ref: keeping it out
  // of the dependency array is what stops the tick effect from re-entering.
  const eventDriftRef = useRef<Record<MarketSector | "All", number>>({
    Residential: 0,
    Office: 0,
    Retail: 0,
    Industrial: 0,
    "Mixed-Use": 0,
    All: 0,
  });

  // Latest props inside the interval without restarting it every render.
  const influenceRef = useRef(influence);
  influenceRef.current = influence;
  const coinDeltaRef = useRef(onCoinDelta);
  coinDeltaRef.current = onCoinDelta;

  const fairFor = useCallback((def: MarketDef, inf: MarketInfluence, drift: number) => {
    const bias =
      (inf.cents[def.id] ?? 0) +
      (inf.sectorCents[def.sector] ?? 0) +
      (inf.categoryCents[def.category] ?? 0) +
      drift;
    return clampPrice(def.baseFair + bias);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((t) => t + 1);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  // One tick of the tape.
  useEffect(() => {
    if (tick === 0) return;
    const inf = influenceRef.current;
    const drift = eventDriftRef.current;

    if (tick % EVENT_EVERY === 0) {
      const evt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      drift[evt.sector] += evt.swing;
      setTape((prev) => [evt.headline, ...prev].slice(0, 40));
      if (evt.id === "logistics-boom") {
        const payout = inf.logisticsDouble ? 120 : 60;
        coinDeltaRef.current(
          payout,
          inf.logisticsDouble
            ? "Logistics Boom paid double — Rickenbacker passive"
            : "Logistics Boom payout"
        );
      }
    }

    setMarkets((prevMarkets) => {
      const next: Record<string, MarketState> = {};
      for (const def of MARKET_DEFS) {
        const state = prevMarkets[def.id];
        const fair = fairFor(def, inf, drift[def.sector] + drift.All);
        // Dominion raises agent conviction: price tracks fair harder.
        const pull = 0.06 + inf.dominion * 0.16;
        const noise = (Math.random() - 0.5) * 2.6;
        const floor = inf.floors[def.id];
        let price = state.price + (fair - state.price) * pull + noise;
        if (typeof floor === "number") price = Math.max(floor, price);
        next[def.id] = { ...state, prev: state.price, price: clampPrice(price) };
      }
      return next;
    });

    // Event drift decays back toward zero.
    for (const key of Object.keys(drift) as (MarketSector | "All")[]) {
      drift[key] = Math.abs(drift[key]) > 0.15 ? drift[key] * 0.9 : 0;
    }
  }, [tick, fairFor]);

  const trade = (def: MarketDef, side: "buy" | "sell") => {
    const state = markets[def.id];
    if (!state) return;

    if (side === "buy") {
      const cost = centsToCoin(state.price, TRADE_QTY);
      if (coin < cost) {
        setTape((prev) => ["Not enough Axis Coin for that stake.", ...prev].slice(0, 40));
        return;
      }
      onCoinDelta(-cost, `Bought ${TRADE_QTY} YES @ ${state.price.toFixed(0)}¢`);
      setMarkets((prev) => ({
        ...prev,
        [def.id]: {
          ...prev[def.id],
          shares: prev[def.id].shares + TRADE_QTY,
          basis: prev[def.id].basis + cost,
        },
      }));
      setTape((prev) =>
        [`YES ${TRADE_QTY} @ ${state.price.toFixed(0)}¢ — ${def.question}`, ...prev].slice(0, 40)
      );
      return;
    }

    if (state.shares <= 0) return;
    const qty = Math.min(TRADE_QTY, state.shares);
    const proceeds = centsToCoin(state.price, qty);
    const releasedBasis = state.shares > 0 ? (state.basis / state.shares) * qty : 0;
    onCoinDelta(proceeds, `Sold ${qty} YES @ ${state.price.toFixed(0)}¢`);
    setMarkets((prev) => ({
      ...prev,
      [def.id]: {
        ...prev[def.id],
        shares: prev[def.id].shares - qty,
        basis: Math.max(0, prev[def.id].basis - releasedBasis),
      },
    }));
    setTape((prev) =>
      [
        `Closed ${qty} @ ${state.price.toFixed(0)}¢ for ${proceeds.toFixed(0)} coin — ${def.question}`,
        ...prev,
      ].slice(0, 40)
    );
  };

  const exposure = useMemo(() => {
    let value = 0;
    let basis = 0;
    for (const def of MARKET_DEFS) {
      const state = markets[def.id];
      if (!state || state.shares === 0) continue;
      value += centsToCoin(state.price, state.shares);
      basis += state.basis;
    }
    return { value, basis, pl: value - basis };
  }, [markets]);

  const influencedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const def of MARKET_DEFS) {
      const touched =
        (influence.cents[def.id] ?? 0) !== 0 ||
        (influence.sectorCents[def.sector] ?? 0) !== 0 ||
        (influence.categoryCents[def.category] ?? 0) !== 0 ||
        typeof influence.floors[def.id] === "number";
      if (touched) ids.add(def.id);
    }
    return ids;
  }, [influence]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Axis Market">
      <div className="modal">
        <div className="market-head">
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Axis Market — Central Ohio</h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 12 }}>
              {influencedIds.size > 0
                ? `${influencedIds.size} market${influencedIds.size === 1 ? "" : "s"} are leaning because of what you own.`
                : "Own property to start bending these markets."}
            </p>
          </div>
          <div className="stat-row">
            <div className="stat">
              <span className="stat-label">Axis Coin</span>
              <span className="stat-value coin">{Math.floor(coin).toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Open P/L</span>
              <span
                className="stat-value"
                style={{ color: exposure.pl >= 0 ? "var(--good)" : "var(--bad)" }}
              >
                {exposure.pl >= 0 ? "+" : ""}
                {exposure.pl.toFixed(0)}
              </span>
            </div>
            <button className="btn" onClick={onClose}>
              Close market
            </button>
          </div>
        </div>

        <div className="market-grid">
          {MARKET_DEFS.map((def) => {
            const state = markets[def.id];
            const delta = state.price - state.prev;
            const posValue = centsToCoin(state.price, state.shares);
            const pl = posValue - state.basis;
            const buyCost = centsToCoin(state.price, TRADE_QTY);
            return (
              <div className="market" key={def.id}>
                <div className="market-meta">
                  <span className={`chip ${def.category}`}>{def.sector}</span>
                  {influencedIds.has(def.id) && <span className="chip rarity-rare">Influenced</span>}
                </div>
                <div className="market-q">{def.question}</div>
                <div className="market-price-row">
                  <span className="market-price">{state.price.toFixed(0)}¢</span>
                  <span className={`market-delta ${delta >= 0 ? "up" : "down"}`}>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}¢
                  </span>
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${state.price}%` }} />
                </div>
                {typeof influence.floors[def.id] === "number" && (
                  <div className="influence-note">
                    Floor held at {influence.floors[def.id]}¢ while you own the corridor.
                  </div>
                )}
                <div className="market-pos">
                  {state.shares > 0 ? (
                    <>
                      {state.shares} YES · value {posValue.toFixed(0)} ·{" "}
                      <span className={`pl ${pl >= 0 ? "up" : "down"}`}>
                        {pl >= 0 ? "+" : ""}
                        {pl.toFixed(0)}
                      </span>
                    </>
                  ) : (
                    "No position"
                  )}
                </div>
                <div className="market-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => trade(def, "buy")}
                    disabled={coin < buyCost}
                  >
                    Buy {TRADE_QTY} · {buyCost.toFixed(0)}
                  </button>
                  <button
                    className="btn"
                    onClick={() => trade(def, "sell")}
                    disabled={state.shares <= 0}
                  >
                    Sell
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="tape">
          <div className="panel-head">
            <h2>The tape</h2>
            <span className="panel-hint">tick {tick}</span>
          </div>
          <div className="log">
            {tape.map((line, i) => (
              <div className="log-line" key={`${i}-${line}`}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
