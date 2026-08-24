import { useEffect } from "react";
import { DRAW_COST } from "../types";
import { TOTAL_TILES } from "../data";
import { useDerived, useEmpire } from "../store";
import { upgradeCost } from "../sim";
import { CardView } from "./CardView";
import { MarketPanel } from "./MarketPanel";

export function HUD() {
  const coin = useEmpire((s) => s.coin);
  const cycle = useEmpire((s) => s.cycle);
  const deckIds = useEmpire((s) => s.deckIds);
  const drew = useEmpire((s) => s.drewThisCycle);
  const loan = useEmpire((s) => s.loan);
  const log = useEmpire((s) => s.log);
  const toasts = useEmpire((s) => s.toasts);
  const rivals = useEmpire((s) => s.rivals);
  const selectedId = useEmpire((s) => s.selectedId);
  const inspectHood = useEmpire((s) => s.inspectHood);
  const upgrades = useEmpire((s) => s.upgrades);
  const markets = useEmpire((s) => s.markets);
  const muted = useEmpire((s) => s.muted);
  const pending = useEmpire((s) => s.pendingEvent);
  const phase = useEmpire((s) => s.phase);
  const stressFired = useEmpire((s) => s.stressFired);
  const collectRent = useEmpire((s) => s.collectRent);
  const drawCard = useEmpire((s) => s.drawCard);
  const setMarketOpen = useEmpire((s) => s.setMarketOpen);
  const selectCard = useEmpire((s) => s.selectCard);
  const placeOnTile = useEmpire((s) => s.placeOnTile);
  const takeLoan = useEmpire((s) => s.takeLoan);
  const repayLoan = useEmpire((s) => s.repayLoan);
  const upgradeOwned = useEmpire((s) => s.upgradeOwned);
  const inspect = useEmpire((s) => s.inspect);
  const dismissEvent = useEmpire((s) => s.dismissEvent);
  const dismissToast = useEmpire((s) => s.dismissToast);
  const toggleMute = useEmpire((s) => s.toggleMute);
  const start = useEmpire((s) => s.start);
  const acknowledgeWin = useEmpire((s) => s.acknowledgeWin);
  const { hand, ownedCards, dominion, rent, worth, season, selected } = useDerived();

  const inspectCard = ownedCards.find((c) => c.neighborhood === inspectHood) ?? null;
  const inspectLevel = inspectCard ? (upgrades[inspectCard.id] ?? 0) : 0;
  const upCost = inspectCard ? upgradeCost(inspectLevel) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "r" || e.key === "R") collectRent();
      if (e.key === "d" || e.key === "D") drawCard();
      if (e.key === "m" || e.key === "M") setMarketOpen(true);
      if (e.key === " ") {
        e.preventDefault();
        if (selected) placeOnTile(selected.neighborhood);
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 9 && hand[n - 1]) selectCard(hand[n - 1]!.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collectRent, drawCard, setMarketOpen, selected, placeOnTile, hand, selectCard]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = window.setTimeout(() => dismissToast(toasts[0]!.id), 2800);
    return () => window.clearTimeout(t);
  }, [toasts, dismissToast]);

  return (
    <>
      <header className="axis-hud-top">
        <div className="axis-brand">
          <p className="axis-kicker">The Columbus Axis</p>
          <strong>
            {season} · Cycle {cycle}
            {stressFired ? " · Post-shock" : ""}
          </strong>
        </div>
        <div className="axis-ticker" aria-hidden>
          {markets.map((m) => (
            <span key={m.id}>
              {m.name} <b>{m.yesCents.toFixed(1)}¢</b>
            </span>
          ))}
        </div>
        <div className="axis-stats">
          <div className="axis-stat axis-stat-gold">
            <span>Axis Coin</span>
            <strong>{Math.round(coin).toLocaleString()}</strong>
          </div>
          <div className="axis-stat">
            <span>Dominion</span>
            <strong>{dominion.toFixed(0)}%</strong>
          </div>
          <div className="axis-stat">
            <span>Rent</span>
            <strong>{rent}</strong>
          </div>
          <div className="axis-stat">
            <span>Net</span>
            <strong>{worth.toLocaleString()}</strong>
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

      <div className="axis-rivals">
        {rivals.map((r) => (
          <div key={r.id} className="axis-rival">
            <i style={{ background: r.color }} />
            <span>{r.name}</span>
            <b>{r.ownedIds.length}</b>
          </div>
        ))}
        {loan > 0 ? (
          <div className="axis-rival">
            <span>Note</span>
            <b>{loan}</b>
          </div>
        ) : null}
      </div>

      <div className="axis-map-hint">
        {selected
          ? `Place ${selected.name} on ${selected.neighborhood}. Drag to orbit.`
          : "Select a card, then click its neighborhood. Drag to orbit."}
      </div>

      <aside className="axis-hand-dock">
        <div className="axis-hand">
          {hand.length === 0 ? (
            <p className="axis-empty">Hand empty. Draw or collect rent.</p>
          ) : (
            hand.map((card) => (
              <div key={card.id} className="axis-card-wrap">
                <CardView
                  card={card}
                  selected={selectedId === card.id}
                  compact
                  onSelect={() => selectCard(card.id)}
                />
                {selectedId === card.id ? (
                  <button
                    type="button"
                    className="axis-btn axis-btn-tiny axis-btn-gold axis-place"
                    onClick={() => placeOnTile(card.neighborhood)}
                  >
                    Place
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
        <div className="axis-side-actions">
          <button type="button" className="axis-btn axis-btn-gold" onClick={collectRent}>
            Collect rent
          </button>
          <button type="button" className="axis-btn" onClick={() => setMarketOpen(true)}>
            Axis Market
          </button>
          <button type="button" className="axis-btn" onClick={drawCard} disabled={drew || deckIds.length === 0}>
            Draw · {DRAW_COST}
          </button>
          {loan > 0 ? (
            <button type="button" className="axis-btn" onClick={repayLoan}>
              Repay note
            </button>
          ) : (
            <button type="button" className="axis-btn" onClick={takeLoan}>
              Draw note
            </button>
          )}
        </div>
      </aside>

      {inspectCard ? (
        <div className="axis-inspect">
          <p className="axis-kicker">{inspectCard.neighborhood}</p>
          <h3>{inspectCard.name}</h3>
          <p>{inspectCard.flavor}</p>
          <p className="axis-muted">
            Tier {inspectLevel + 1} · {inspectCard.baseRent + inspectLevel * 4} rent
          </p>
          <div className="axis-inspect-actions">
            {upCost != null ? (
              <button type="button" className="axis-btn axis-btn-tiny axis-btn-gold" onClick={() => upgradeOwned(inspectCard.id)}>
                Renovate · {upCost}
              </button>
            ) : (
              <span className="axis-muted">Fully improved.</span>
            )}
            <button type="button" className="axis-icon-btn" onClick={() => inspect(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      <footer className="axis-log" aria-live="polite">
        {log.slice(0, 3).map((line) => (
          <span key={line.t + line.text}>{line.text}</span>
        ))}
      </footer>

      <button type="button" className="axis-mute" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
        {muted ? "Sound off" : "Sound on"}
      </button>

      <div className="axis-toasts">
        {toasts.map((t) => (
          <button key={t.id} type="button" className={`axis-toast ${t.kind}`} onClick={() => dismissToast(t.id)}>
            {t.text}
          </button>
        ))}
      </div>

      {pending ? (
        <div className="axis-modal-backdrop" role="presentation" onClick={dismissEvent}>
          <div className="axis-modal axis-event" role="dialog" onClick={(e) => e.stopPropagation()}>
            <p className="axis-kicker">City desk</p>
            <h2>{pending.title}</h2>
            <p className="axis-lede">{pending.body}</p>
            <button type="button" className="axis-btn axis-btn-primary" onClick={dismissEvent}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {phase === "won" || phase === "lost" ? (
        <div className="axis-modal-backdrop" role="presentation">
          <div className="axis-modal" role="dialog">
            <p className="axis-kicker">{phase === "won" ? "Dominion" : "Receivership"}</p>
            <h2>{phase === "won" ? "King of the Buckeye State" : "The Axis broke"}</h2>
            <p className="axis-lede">
              {phase === "won"
                ? `You held ${dominion.toFixed(0)}% Dominion. Net ${worth.toLocaleString()}. Central Ohio prices your name into the tape.`
                : `Cycle ${cycle} closed the book. Coin ${Math.round(coin)}. Dominion ${dominion.toFixed(0)}%.`}
            </p>
            <div className="axis-title-actions">
              {phase === "won" ? (
                <button type="button" className="axis-btn axis-btn-primary" onClick={acknowledgeWin}>
                  Keep trading
                </button>
              ) : null}
              <button type="button" className="axis-btn" onClick={() => start(true)}>
                New empire
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MarketPanel />
    </>
  );
}
