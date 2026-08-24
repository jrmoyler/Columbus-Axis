import "./App.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AxisMarket } from "./AxisMarketColumbus";
import {
  computeDominion,
  computeRent,
  influenceFrom,
  logisticsOwned,
  resolvePlay,
  tickEffects,
} from "./lib/empire";
import { tickMarkets } from "./data/market";
import OhioMap3D from "./components/OhioMap3D";
import { PROPERTY_CARDS, TOTAL_TILES, type PropertyCard } from "./data/properties";
import {
  cardMap,
  clearEmpire,
  loadEmpire,
  newEmpire,
  ownedRecord,
  persistEmpire,
  type EmpireState,
} from "./lib/save";

const DRAW_COST = 40;
const STRESS_CYCLE = 6;
const WIN_DOMINION = 60;

function pushLog(state: EmpireState, text: string): EmpireState {
  return { ...state, log: [{ t: Date.now(), text }, ...state.log].slice(0, 40) };
}

function applyTicks(state: EmpireState, n: number, shock: Record<string, number> = {}): EmpireState {
  let markets = state.markets;
  let effects = state.effects;
  const owned = cardMap(state.ownedIds);
  for (let i = 0; i < n; i++) {
    const inf = influenceFrom(owned, effects);
    markets = tickMarkets(markets, inf, i === 0 ? shock : {});
    effects = tickEffects(effects);
  }
  return { ...state, markets, effects };
}

export default function App() {
  const [state, setState] = useState<EmpireState>(() => newEmpire());
  const [restored, setRestored] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);

  useEffect(() => {
    setState(loadEmpire());
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    persistEmpire(state);
  }, [restored, state]);

  useEffect(() => {
    if (!restored) return;
    const flush = () => persistEmpire(state);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, [restored, state]);

  const ownedCards = useMemo(() => cardMap(state.ownedIds), [state.ownedIds]);
  const hand = useMemo(() => cardMap(state.handIds), [state.handIds]);
  const owned = useMemo(() => ownedRecord(state.ownedIds), [state.ownedIds]);
  const selected = useMemo(
    () => PROPERTY_CARDS.find((c) => c.id === state.selectedId) ?? null,
    [state.selectedId],
  );
  const dominion = computeDominion(ownedCards);
  const rent = computeRent(ownedCards, state.markets);
  const influence = useMemo(
    () => influenceFrom(ownedCards, state.effects),
    [ownedCards, state.effects],
  );

  const start = (fresh: boolean) => {
    if (fresh) {
      clearEmpire();
      setState({ ...newEmpire(), phase: "playing" });
      return;
    }
    setState((s) => ({ ...s, phase: "playing" }));
  };

  const placeOnTile = useCallback(
    (neighborhood: string) => {
      setState((s) => {
        if (s.phase !== "playing") return s;
        const card = PROPERTY_CARDS.find((c) => c.id === s.selectedId);
        if (!card) return pushLog(s, "Select a card in your hand first.");
        if (!s.handIds.includes(card.id)) return s;
        if (card.neighborhood !== neighborhood) {
          return pushLog(s, `${card.name} can only be placed in ${card.neighborhood}.`);
        }
        if (s.ownedIds.some((id) => PROPERTY_CARDS.find((c) => c.id === id)?.neighborhood === neighborhood)) {
          return pushLog(s, `${neighborhood} is already claimed.`);
        }
        if (s.coin < card.cost) return pushLog(s, `Need ${card.cost} Axis Coin to close ${card.name}.`);

        const played = resolvePlay(card);
        let next: EmpireState = {
          ...s,
          coin: s.coin - card.cost + played.coinDelta,
          handIds: s.handIds.filter((id) => id !== card.id),
          ownedIds: [...s.ownedIds, card.id],
          selectedId: s.handIds.find((id) => id !== card.id) ?? null,
          effects: [...s.effects, ...played.effects],
        };
        next = applyTicks(next, 2, played.shock);
        next = pushLog(next, played.log);
        return maybeTerminal(next);
      });
    },
    [],
  );

  const collectRent = () => {
    setState((s) => {
      if (s.phase !== "playing") return s;
      const cards = cardMap(s.ownedIds);
      if (cards.length === 0) return pushLog(s, "No holdings yet — place a card on the map.");
      const income = computeRent(cards, s.markets);
      let next: EmpireState = {
        ...s,
        coin: s.coin + income,
        cycle: s.cycle + 1,
        drewThisCycle: false,
      };
      next = applyTicks(next, 6);
      next = maybeStress(next);
      next = pushLog(next, `Collected ${income} rent. Cycle ${next.cycle}.`);
      return maybeTerminal(next);
    });
  };

  const drawCard = () => {
    setState((s) => {
      if (s.phase !== "playing") return s;
      if (s.drewThisCycle) return pushLog(s, "Already drew this cycle.");
      if (s.deckIds.length === 0) return pushLog(s, "The acquisition stack is empty.");
      if (s.coin < DRAW_COST) return pushLog(s, `Drawing costs ${DRAW_COST} Axis Coin.`);
      const [id, ...rest] = s.deckIds;
      if (!id) return s;
      const card = PROPERTY_CARDS.find((c) => c.id === id);
      let next: EmpireState = {
        ...s,
        coin: s.coin - DRAW_COST,
        deckIds: rest,
        handIds: [...s.handIds, id],
        selectedId: id,
        drewThisCycle: true,
      };
      next = pushLog(next, `Drew ${card?.name ?? "a card"} for ${DRAW_COST} coin.`);
      return next;
    });
  };

  const tickTape = () => {
    setState((s) => applyTicks(s, 1));
  };

  if (state.phase === "title") {
    const hasProgress = state.ownedIds.length > 0 || state.cycle > 1 || state.coin !== 1000;
    return (
      <div className="axis-root">
        <div className="axis-title">
          <div className="axis-title-card">
            <p className="axis-kicker">Collective / Hataalii</p>
            <h1>The Columbus Axis</h1>
            <p className="axis-sub">
              Become King of the Buckeye State. Collect property cards, raise steel on a living map
              of Central Ohio, and let ownership — not sliders — drive the prediction tape.
            </p>
            <ul className="axis-rules">
              <li>Select a card, then click its neighborhood on the 3D map.</li>
              <li>Collect rent each cycle. Draw to expand the hand.</li>
              <li>Open Axis Market — your holdings bias fair value.</li>
              <li>
                Win at {WIN_DOMINION}% Dominion after surviving the cycle-{STRESS_CYCLE} rate shock.
              </li>
            </ul>
            <div className="axis-title-actions">
              <button type="button" className="axis-btn axis-btn-primary" onClick={() => start(true)}>
                New empire
              </button>
              {hasProgress ? (
                <button type="button" className="axis-btn" onClick={() => start(false)}>
                  Continue
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="axis-root">
      <div className="axis-shell">
        <header className="axis-topbar">
          <div className="axis-shell-brand">
            <p className="axis-kicker">Central Ohio</p>
            <h1>The Columbus Axis</h1>
          </div>
          <div className="axis-stats">
            <div className="axis-stat axis-stat-gold">
              <span>Axis Coin</span>
              <strong>{Math.round(state.coin).toLocaleString()}</strong>
            </div>
            <div className="axis-stat">
              <span>Dominion</span>
              <strong>{dominion.toFixed(0)}%</strong>
            </div>
            <div className="axis-stat">
              <span>Cycle</span>
              <strong>{state.cycle}</strong>
            </div>
            <div className="axis-stat">
              <span>Rent / cycle</span>
              <strong>{rent}</strong>
            </div>
            <div className="axis-stat">
              <span>Tiles</span>
              <strong>
                {ownedCards.length}/{TOTAL_TILES}
              </strong>
            </div>
          </div>
        </header>

        <div className="axis-dominion" aria-hidden>
          <i style={{ width: `${dominion}%` }} />
        </div>

        <div className="axis-body">
          <div className="axis-map-wrap">
            <OhioMap3D owned={owned} selectedCard={selected} onTileClick={placeOnTile} />
            <p className="axis-map-hint">
              {selected
                ? `Place ${selected.name} on ${selected.neighborhood}. Drag to orbit.`
                : "Select a card, then click its neighborhood. Drag to orbit."}
            </p>
          </div>

          <aside className="axis-side">
            <div className="axis-side-scroll">
              <section>
                <p className="axis-kicker">Hand</p>
                <div className="axis-hand">
                  {hand.length === 0 ? (
                    <p className="axis-empty">Hand empty. Draw or collect rent.</p>
                  ) : (
                    hand.map((card) => (
                      <CardButton
                        key={card.id}
                        card={card}
                        selected={state.selectedId === card.id}
                        onSelect={() => setState((s) => ({ ...s, selectedId: card.id }))}
                        onPlace={() => placeOnTile(card.neighborhood)}
                      />
                    ))
                  )}
                </div>
              </section>

              <section>
                <p className="axis-kicker">Holdings</p>
                <div className="axis-holdings">
                  {ownedCards.length === 0 ? (
                    <p className="axis-empty">No steel in the ground yet.</p>
                  ) : (
                    ownedCards.map((card) => (
                      <div key={card.id} className="axis-holding">
                        <span>{card.neighborhood}</span>
                        <span>{card.baseRent} rent</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
            <div className="axis-side-actions">
              <button type="button" className="axis-btn axis-btn-gold" onClick={collectRent}>
                Collect rent
              </button>
              <button type="button" className="axis-btn" onClick={() => setMarketOpen(true)}>
                Axis Market
              </button>
              <button
                type="button"
                className="axis-btn"
                onClick={drawCard}
                disabled={state.drewThisCycle || state.deckIds.length === 0}
              >
                Draw · {DRAW_COST}
              </button>
            </div>
          </aside>
        </div>

        <footer className="axis-log" aria-live="polite">
          {state.log.slice(0, 4).map((line) => (
            <span key={line.t + line.text}>{line.text}</span>
          ))}
        </footer>
      </div>

      <AxisMarket
        open={marketOpen}
        coin={state.coin}
        markets={state.markets}
        positions={state.positions}
        influence={influence}
        onClose={() => setMarketOpen(false)}
        onTick={tickTape}
        onBuy={(positions, spent, note) =>
          setState((s) => pushLog({ ...s, positions, coin: s.coin - spent }, note))
        }
        onSell={(positions, proceeds, note) =>
          setState((s) => pushLog({ ...s, positions, coin: s.coin + proceeds }, note))
        }
      />

      {state.phase === "won" || state.phase === "lost" ? (
        <EndScreen
          won={state.phase === "won"}
          dominion={dominion}
          coin={state.coin}
          cycle={state.cycle}
          onContinue={() =>
            setState((s) => ({
              ...s,
              phase: "playing",
              winAcknowledged: true,
            }))
          }
          onReset={() => start(true)}
        />
      ) : null}
    </div>
  );
}

function CardButton({
  card,
  selected,
  onSelect,
  onPlace,
}: {
  card: PropertyCard;
  selected: boolean;
  onSelect: () => void;
  onPlace: () => void;
}) {
  return (
    <div className={`axis-card${selected ? " is-selected" : ""}`}>
      <button type="button" className="axis-card-select" onClick={onSelect}>
        <div className="axis-card-top">
          <h3>{card.name}</h3>
          <span className={`axis-rarity ${card.rarity}`}>{card.rarity}</span>
        </div>
        <div className="axis-meta">
          <span>{card.neighborhood}</span>
          <span>{card.subtype}</span>
          <span>{card.cost} coin</span>
          <span>{card.baseRent} rent</span>
        </div>
        <p className="axis-ability">{card.ability}</p>
      </button>
      {selected ? (
        <button type="button" className="axis-btn axis-btn-tiny axis-btn-gold" onClick={onPlace}>
          Place on {card.neighborhood}
        </button>
      ) : null}
    </div>
  );
}

function EndScreen({
  won,
  dominion,
  coin,
  cycle,
  onContinue,
  onReset,
}: {
  won: boolean;
  dominion: number;
  coin: number;
  cycle: number;
  onContinue: () => void;
  onReset: () => void;
}) {
  return (
    <div className="axis-modal-backdrop" role="presentation">
      <div className="axis-modal" role="dialog" aria-labelledby="axis-end-title">
        <p className="axis-kicker">{won ? "Dominion" : "Receivership"}</p>
        <h2 id="axis-end-title">{won ? "King of the Buckeye State" : "The Axis broke"}</h2>
        <p className="axis-sub">
          {won
            ? `You held ${dominion.toFixed(0)}% Dominion through the rate shock. Central Ohio prices your name into the tape.`
            : `Cycle ${cycle} closed the book. Coin ${Math.round(coin)}. Dominion ${dominion.toFixed(0)}%. Charter another empire.`}
        </p>
        <div className="axis-title-actions" style={{ marginTop: 16 }}>
          {won ? (
            <button type="button" className="axis-btn axis-btn-primary" onClick={onContinue}>
              Keep trading
            </button>
          ) : null}
          <button type="button" className="axis-btn" onClick={onReset}>
            New empire
          </button>
        </div>
      </div>
    </div>
  );
}

function maybeStress(state: EmpireState): EmpireState {
  if (state.stressFired || state.cycle < STRESS_CYCLE) return state;
  const owned = cardMap(state.ownedIds);
  const shock: Record<string, number> = { "*": -12, "intel-timeline": -8 };
  if (owned.some((c) => c.abilityKey === "intel-floor")) {
    shock["intel-timeline"] = -2;
  }
  let incomeHit = Math.round(computeRent(owned, state.markets) * 2.5);
  if (logisticsOwned(owned)) {
    const boom = state.markets.find((m) => m.id === "logistics-boom");
    if ((boom?.yesCents ?? 0) >= 50) incomeHit = Math.round(incomeHit * 0.5);
  }
  let next: EmpireState = {
    ...state,
    stressFired: true,
    coin: Math.max(0, state.coin - incomeHit),
  };
  next = applyTicks(next, 4, shock);
  next.survivedStress = next.coin > 0 && owned.length >= 2;
  next = pushLog(
    next,
    next.survivedStress
      ? `Rate shock. Mark-to-market bleed ${incomeHit}. You held the line.`
      : `Rate shock. Bleed ${incomeHit}. The Axis could not clear.`,
  );
  return next;
}

function maybeTerminal(state: EmpireState): EmpireState {
  const owned = cardMap(state.ownedIds);
  const dominion = computeDominion(owned);
  if (state.stressFired && !state.survivedStress) {
    return { ...state, phase: "lost" };
  }
  if (
    state.survivedStress &&
    !state.winAcknowledged &&
    dominion >= WIN_DOMINION &&
    state.phase === "playing"
  ) {
    return pushLog({ ...state, phase: "won" }, "Dominion threshold cleared. The Buckeye State is yours.");
  }
  if (state.coin <= 0 && owned.length === 0) {
    return { ...state, phase: "lost" };
  }
  return state;
}
