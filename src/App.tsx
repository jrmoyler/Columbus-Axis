// The Columbus Axis — shell: economy, hand, ability resolution, market modal.

import { useCallback, useEffect, useMemo, useState } from "react";
import OhioMap3D from "./components/OhioMap3D";
import AxisMarketColumbus from "./AxisMarketColumbus";
import type { MarketInfluence, MarketSector } from "./AxisMarketColumbus";
import { PROPERTY_CARDS, STARTER_HAND_IDS } from "./data/properties";
import type { PropertyCard } from "./data/properties";
import "./App.css";

const STARTING_COIN = 1000;
const DRAW_COST = 60;
const DOMINION_TARGET = 60;
const TEMP_TICK_MS = 1000;

const CARDS_BY_ID = new Map(PROPERTY_CARDS.map((c) => [c.id, c]));

interface LogLine {
  id: number;
  text: string;
  tone: "plain" | "good" | "bad" | "gold";
}

interface TempEffect {
  id: number;
  label: string;
  ticksLeft: number;
  categoryCents?: Partial<Record<"residential" | "commercial", number>>;
  sectorCents?: Partial<Record<MarketSector, number>>;
}

/** Dominion counts Arena District twice — it scores as residential and commercial. */
function dominionScore(owned: Record<string, PropertyCard>) {
  let score = 0;
  for (const card of Object.values(owned)) {
    score += card.abilityKey === "dual-count" ? 2 : 1;
  }
  const max = PROPERTY_CARDS.length + 2;
  return Math.min(100, Math.round((score / max) * 100));
}

/** Metro supply is "tight" once the player has cornered three residential blocks. */
function isTightSupply(owned: Record<string, PropertyCard>) {
  return Object.values(owned).filter((c) => c.category === "residential").length >= 3;
}

function rentFor(card: PropertyCard, owned: Record<string, PropertyCard>) {
  const others = Object.values(owned).filter((c) => c.id !== card.id);
  let rent = card.baseRent;
  switch (card.abilityKey) {
    case "adjacency-residential":
      rent += others.filter((c) => c.category === "residential").length;
      break;
    case "industrial-synergy":
      if (others.some((c) => c.id === "rickenbacker-logistics")) rent += 3;
      break;
    case "tight-supply-rent":
      if (isTightSupply(owned)) rent += 2;
      break;
    default:
      break;
  }
  return rent;
}

export default function App() {
  const [coin, setCoin] = useState(STARTING_COIN);
  const [hand, setHand] = useState<string[]>(STARTER_HAND_IDS);
  const [deck, setDeck] = useState<string[]>(() =>
    PROPERTY_CARDS.filter((c) => !STARTER_HAND_IDS.includes(c.id)).map((c) => c.id)
  );
  const [owned, setOwned] = useState<Record<string, PropertyCard>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tempEffects, setTempEffects] = useState<TempEffect[]>([]);
  const [counterSurge, setCounterSurge] = useState(false);
  const [cycle, setCycle] = useState(1);
  const [marketOpen, setMarketOpen] = useState(false);
  const [log, setLog] = useState<LogLine[]>([
    {
      id: 0,
      text: "You start with 1,000 Axis Coin and three deeds. Select a card, then click its neighborhood on the map.",
      tone: "plain",
    },
  ]);

  const pushLog = useCallback((text: string, tone: LogLine["tone"] = "plain") => {
    setLog((prev) => [{ id: Date.now() + Math.random(), text, tone }, ...prev].slice(0, 60));
  }, []);

  const addCoin = useCallback(
    (delta: number, reason: string) => {
      setCoin((prev) => Math.max(0, prev + delta));
      if (reason) pushLog(`${delta >= 0 ? "+" : ""}${delta.toFixed(0)} coin — ${reason}`, delta >= 0 ? "gold" : "plain");
    },
    [pushLog]
  );

  // Temporary, ability-granted market bias expires on its own clock.
  useEffect(() => {
    if (tempEffects.length === 0) return;
    const timer = window.setInterval(() => {
      setTempEffects((prev) =>
        prev
          .map((e) => ({ ...e, ticksLeft: e.ticksLeft - 1 }))
          .filter((e) => e.ticksLeft > 0)
      );
    }, TEMP_TICK_MS);
    return () => window.clearInterval(timer);
  }, [tempEffects.length]);

  const selectedCard = selectedId ? CARDS_BY_ID.get(selectedId) ?? null : null;
  const ownedList = useMemo(() => Object.values(owned), [owned]);
  const dominion = dominionScore(owned);
  const rentPerCycle = useMemo(
    () => ownedList.reduce((sum, card) => sum + rentFor(card, owned), 0),
    [ownedList, owned]
  );

  // Everything the empire pushes into the tape, derived from what is owned.
  const influence = useMemo<MarketInfluence>(() => {
    const inf: MarketInfluence = {
      cents: {},
      sectorCents: {},
      categoryCents: {},
      floors: {},
      dominion: dominion / 100,
      logisticsDouble: false,
    };

    for (const card of ownedList) {
      switch (card.abilityKey) {
        case "bias-short-north":
          inf.cents["short-north-inventory"] = (inf.cents["short-north-inventory"] ?? 0) + 4;
          break;
        case "conversion-pressure":
          inf.sectorCents.Office = (inf.sectorCents.Office ?? 0) + 5;
          inf.cents["conversion-permits"] = (inf.cents["conversion-permits"] ?? 0) + 6;
          break;
        case "retail-boost":
          inf.sectorCents.Retail = (inf.sectorCents.Retail ?? 0) + 6;
          break;
        case "intel-floor":
          inf.floors["intel-timeline"] = 35;
          break;
        case "logistics-double":
          inf.logisticsDouble = true;
          inf.sectorCents.Industrial = (inf.sectorCents.Industrial ?? 0) + 3;
          break;
        case "industrial-synergy":
          inf.cents["groveport-spec"] = (inf.cents["groveport-spec"] ?? 0) + 4;
          break;
        case "dual-count":
          inf.cents["arena-mixed-lease"] = (inf.cents["arena-mixed-lease"] ?? 0) + 5;
          break;
        case "tight-supply-rent":
          if (isTightSupply(owned)) {
            inf.categoryCents.residential = (inf.categoryCents.residential ?? 0) + 3;
          }
          break;
        default:
          break;
      }
    }

    for (const effect of tempEffects) {
      for (const [key, value] of Object.entries(effect.categoryCents ?? {})) {
        const k = key as "residential" | "commercial";
        inf.categoryCents[k] = (inf.categoryCents[k] ?? 0) + value;
      }
      for (const [key, value] of Object.entries(effect.sectorCents ?? {})) {
        const k = key as MarketSector;
        inf.sectorCents[k] = (inf.sectorCents[k] ?? 0) + value;
      }
    }

    return inf;
  }, [ownedList, owned, tempEffects, dominion]);

  const resolveOnPlay = useCallback(
    (card: PropertyCard) => {
      switch (card.abilityKey) {
        case "starter-boost":
          addCoin(50, "Clintonville starter incentive");
          break;
        case "com-avg-bump":
          setTempEffects((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              label: "Bridge Street: commercial YES +3¢",
              ticksLeft: 8,
              categoryCents: { commercial: 3 },
            },
          ]);
          pushLog("Commercial average YES lifted 3¢ for 8 ticks.", "good");
          break;
        case "counter-surge":
          setCounterSurge(true);
          pushLog("Franklinton unlocked a one-time Inventory Surge counter-event.", "good");
          break;
        case "retail-boost":
          pushLog("Retail foot-traffic markets repriced +6¢.", "good");
          break;
        case "conversion-pressure":
          pushLog("Conversion incentive pressure applied to Office markets.", "good");
          break;
        case "intel-floor":
          pushLog("Intel-timeline market floored at 35¢ while you hold the corridor.", "good");
          break;
        case "bias-short-north":
          pushLog("Short North inventory market biased +4¢.", "good");
          break;
        default:
          break;
      }
    },
    [addCoin, pushLog]
  );

  const handleTileClick = useCallback(
    (neighborhood: string) => {
      if (owned[neighborhood]) {
        pushLog(`You already hold ${neighborhood}.`, "plain");
        return;
      }
      if (!selectedCard) {
        pushLog(`Select a card first, then claim ${neighborhood}.`, "plain");
        return;
      }
      if (selectedCard.neighborhood !== neighborhood) {
        pushLog(
          `${selectedCard.name} can only be placed in ${selectedCard.neighborhood}.`,
          "bad"
        );
        return;
      }
      if (coin < selectedCard.cost) {
        pushLog(`Not enough Axis Coin for ${selectedCard.name} (${selectedCard.cost}).`, "bad");
        return;
      }

      const card = selectedCard;
      setCoin((prev) => prev - card.cost);
      setOwned((prev) => ({ ...prev, [neighborhood]: card }));
      setHand((prev) => prev.filter((id) => id !== card.id));
      setSelectedId(null);
      pushLog(`Claimed ${card.name} in ${neighborhood} for ${card.cost} coin.`, "gold");
      resolveOnPlay(card);
    },
    [coin, owned, pushLog, resolveOnPlay, selectedCard]
  );

  const collectRent = () => {
    if (rentPerCycle <= 0) {
      pushLog("Nothing to collect yet — place a property first.", "plain");
      return;
    }
    setCoin((prev) => prev + rentPerCycle);
    setCycle((prev) => prev + 1);
    pushLog(`Cycle ${cycle} rent collected: +${rentPerCycle} coin.`, "good");
  };

  const drawCard = () => {
    if (deck.length === 0) {
      pushLog("The deck is empty. Every deed in Central Ohio is in play.", "plain");
      return;
    }
    if (coin < DRAW_COST) {
      pushLog(`Drawing costs ${DRAW_COST} coin.`, "bad");
      return;
    }
    const index = Math.floor(Math.random() * deck.length);
    const drawn = deck[index];
    setDeck((prev) => prev.filter((_, i) => i !== index));
    setHand((prev) => [...prev, drawn]);
    setCoin((prev) => prev - DRAW_COST);
    pushLog(`Drew ${CARDS_BY_ID.get(drawn)?.name ?? drawn}.`, "plain");
  };

  const playCounterSurge = () => {
    if (!counterSurge) return;
    setCounterSurge(false);
    setTempEffects((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        label: "Inventory Surge: residential YES −6¢",
        ticksLeft: 10,
        categoryCents: { residential: -6 },
      },
    ]);
    pushLog("Inventory Surge fired — residential YES pushed down 6¢ for 10 ticks.", "good");
  };

  return (
    <div className="axis-app">
      <header className="axis-header">
        <div>
          <h1 className="axis-title">
            The Columbus <span>Axis</span>
          </h1>
          <p className="axis-tagline">
            Collect deeds, raise buildings on Central Ohio, and let what you own bend the
            prediction market. Neighborhood names are real; every figure is fiction.
          </p>
        </div>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">Axis Coin</span>
            <span className="stat-value coin">{Math.floor(coin).toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Rent / cycle</span>
            <span className="stat-value">{rentPerCycle}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Holdings</span>
            <span className="stat-value">
              {ownedList.length}/{PROPERTY_CARDS.length}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Dominion</span>
            <span className="stat-value dominion">{dominion}%</span>
          </div>
        </div>
      </header>

      {dominion >= DOMINION_TARGET && (
        <div className="banner">
          Dominion {dominion}% — you control Central Ohio. Hold the tape through a stress
          event to close it out.
        </div>
      )}

      <div className="axis-body">
        <section className="panel">
          <div className="panel-head">
            <h2>Central Ohio</h2>
            <span className="panel-hint">drag to orbit · click a tile to claim</span>
          </div>
          <div className="map-wrap">
            <OhioMap3D
              owned={owned}
              selectedCard={selectedCard}
              onTileClick={handleTileClick}
            />
          </div>

          <div className="panel-head" style={{ marginTop: 16 }}>
            <h2>Holdings</h2>
            <span className="panel-hint">
              {isTightSupply(owned) ? "metro supply: tight" : "metro supply: normal"}
            </span>
          </div>
          {ownedList.length === 0 ? (
            <p className="empty-note">No deeds yet.</p>
          ) : (
            <div className="holdings">
              {Object.entries(owned).map(([hood, card]) => (
                <div className="holding" key={hood}>
                  <span className="holding-name">
                    <span className={`dot ${card.category}`} />
                    {card.name}
                    <span style={{ color: "var(--muted)" }}>· {card.subtype}</span>
                  </span>
                  <span className="holding-rent">+{rentFor(card, owned)}/cycle</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel">
            <div className="panel-head">
              <h2>Your hand</h2>
              <span className="panel-hint">{deck.length} left in deck</span>
            </div>
            {hand.length === 0 ? (
              <p className="empty-note">Hand empty — draw a card.</p>
            ) : (
              <div className="hand">
                {hand.map((id) => {
                  const card = CARDS_BY_ID.get(id);
                  if (!card) return null;
                  const affordable = coin >= card.cost;
                  const taken = Boolean(owned[card.neighborhood]);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`card ${selectedId === id ? "selected" : ""}`}
                      onClick={() => setSelectedId(selectedId === id ? null : id)}
                      disabled={!affordable || taken}
                      title={
                        taken
                          ? `${card.neighborhood} is already claimed`
                          : affordable
                            ? `Place in ${card.neighborhood}`
                            : "Not enough Axis Coin"
                      }
                    >
                      <div className="card-top">
                        <span className={`chip ${card.category}`}>{card.subtype}</span>
                        <span className={`chip rarity-${card.rarity}`}>{card.rarity}</span>
                      </div>
                      <div className="card-name">{card.name}</div>
                      <div className="card-hood">{card.neighborhood}</div>
                      <div className="card-stats">
                        <span className="card-cost">{card.cost} coin</span>
                        <span className="card-rent">+{card.baseRent}/cycle</span>
                      </div>
                      <div className="card-ability">{card.ability}</div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedCard && (
              <p className="panel-hint" style={{ display: "block", marginTop: 10 }}>
                Selected: {selectedCard.name} — click {selectedCard.neighborhood} on the map.
              </p>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Actions</h2>
              <span className="panel-hint">cycle {cycle}</span>
            </div>
            <div className="btn-row">
              <button className="btn btn-gold" onClick={collectRent} disabled={rentPerCycle <= 0}>
                Collect rent (+{rentPerCycle})
              </button>
              <button className="btn" onClick={drawCard} disabled={deck.length === 0 || coin < DRAW_COST}>
                Draw card ({DRAW_COST})
              </button>
              <button className="btn btn-primary" onClick={() => setMarketOpen(true)}>
                Open Axis Market
              </button>
              {counterSurge && (
                <button className="btn btn-gold" onClick={playCounterSurge}>
                  Fire Inventory Surge
                </button>
              )}
            </div>
            {tempEffects.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {tempEffects.map((e) => (
                  <div className="influence-note" key={e.id}>
                    {e.label} — {e.ticksLeft} ticks left
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Log</h2>
            </div>
            <div className="log">
              {log.map((line) => (
                <div className={`log-line ${line.tone}`} key={line.id}>
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {marketOpen && (
        <AxisMarketColumbus
          influence={influence}
          coin={coin}
          onCoinDelta={addCoin}
          onClose={() => setMarketOpen(false)}
        />
      )}
    </div>
  );
}
