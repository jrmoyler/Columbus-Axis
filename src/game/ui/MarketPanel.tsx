import { useMemo, useState } from "react";
import { useEmpire, useDerived } from "../store";
import { positionValue } from "../sim";

const STAKES = [25, 50, 100];

function Spark({ history }: { history: number[] }) {
  const pts = useMemo(() => {
    if (history.length < 2) return "";
    const min = Math.min(...history, 20);
    const max = Math.max(...history, 80);
    const span = Math.max(1, max - min);
    return history
      .map((y, i) => {
        const x = (i / (history.length - 1)) * 100;
        const yy = 28 - ((y - min) / span) * 24;
        return `${x},${yy}`;
      })
      .join(" ");
  }, [history]);
  return (
    <svg className="axis-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.6" points={pts} />
    </svg>
  );
}

export function MarketPanel() {
  const open = useEmpire((s) => s.marketOpen);
  const coin = useEmpire((s) => s.coin);
  const markets = useEmpire((s) => s.markets);
  const positions = useEmpire((s) => s.positions);
  const onClose = useEmpire((s) => s.setMarketOpen);
  const buy = useEmpire((s) => s.buy);
  const sell = useEmpire((s) => s.sell);
  const tick = useEmpire((s) => s.tickTape);
  const { influence } = useDerived();
  const [stake, setStake] = useState(50);
  const [picked, setPicked] = useState(markets[0]?.id ?? "sn-inventory");
  if (!open) return null;
  const market = markets.find((m) => m.id === picked) ?? markets[0];
  if (!market) return null;
  const yesPos = positions.find((p) => p.marketId === market.id && p.side === "yes");
  const noPos = positions.find((p) => p.marketId === market.id && p.side === "no");
  const bias = influence.bias[market.id] ?? 0;
  const floor = influence.floor[market.id];

  return (
    <div className="axis-modal-backdrop" onClick={() => onClose(false)} role="presentation">
      <div
        className="axis-modal axis-market-modal"
        role="dialog"
        aria-labelledby="axis-market-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="axis-modal-head">
          <div>
            <p className="axis-kicker">Axis Market</p>
            <h2 id="axis-market-title">Central Ohio tape</h2>
            <p className="axis-sub">Ownership sets fair value. There are no free sliders.</p>
          </div>
          <button type="button" className="axis-icon-btn" onClick={() => onClose(false)}>
            Close
          </button>
        </header>
        <div className="axis-market-layout">
          <ul className="axis-market-list">
            {markets.map((m) => {
              const pos = positions.filter((p) => p.marketId === m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={m.id === market.id ? "is-active" : undefined}
                    onClick={() => setPicked(m.id)}
                  >
                    <span className="axis-market-name">{m.name}</span>
                    <span className="axis-market-px">{m.yesCents.toFixed(1)}¢</span>
                    {pos.length > 0 ? <span className="axis-chip">Open</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="axis-market-detail">
            <h3>{market.name}</h3>
            <p className="axis-sub">{market.question}</p>
            <Spark history={market.history} />
            <div className="axis-yesno">
              <div>
                <span>YES</span>
                <strong>{market.yesCents.toFixed(1)}¢</strong>
              </div>
              <div>
                <span>NO</span>
                <strong>{(100 - market.yesCents).toFixed(1)}¢</strong>
              </div>
              <div>
                <span>Fair</span>
                <strong>{market.fairCents.toFixed(1)}¢</strong>
              </div>
            </div>
            <p className="axis-influence">
              {bias !== 0 ? `Holdings bias ${bias > 0 ? "+" : ""}${bias.toFixed(1)}¢. ` : "No direct holdings bias. "}
              {floor != null ? `Floor ${floor}¢ is live.` : "No floor."}
            </p>
            <div className="axis-stake-row">
              {STAKES.map((st) => (
                <button
                  key={st}
                  type="button"
                  className={stake === st ? "is-active" : undefined}
                  onClick={() => setStake(st)}
                >
                  {st}
                </button>
              ))}
              <span className="axis-muted">Stake</span>
            </div>
            <div className="axis-actions">
              <button type="button" className="axis-btn axis-btn-primary" onClick={() => buy(market.id, "yes", stake)} disabled={coin < 5}>
                Buy YES
              </button>
              <button type="button" className="axis-btn" onClick={() => buy(market.id, "no", stake)} disabled={coin < 5}>
                Buy NO
              </button>
              <button type="button" className="axis-btn" onClick={tick}>
                Step tape
              </button>
            </div>
            <div className="axis-positions">
              <p className="axis-kicker">Position</p>
              {!yesPos && !noPos ? <p className="axis-muted">Flat.</p> : null}
              {yesPos ? (
                <div className="axis-pos-row">
                  <span>
                    YES {yesPos.shares.toFixed(2)} @ {yesPos.avgCents.toFixed(1)}¢ · MTM{" "}
                    {Math.round(positionValue(yesPos, market.yesCents))}
                  </span>
                  <button type="button" className="axis-btn axis-btn-tiny" onClick={() => sell(market.id, "yes")}>
                    Close
                  </button>
                </div>
              ) : null}
              {noPos ? (
                <div className="axis-pos-row">
                  <span>
                    NO {noPos.shares.toFixed(2)} @ {noPos.avgCents.toFixed(1)}¢ · MTM{" "}
                    {Math.round(positionValue(noPos, market.yesCents))}
                  </span>
                  <button type="button" className="axis-btn axis-btn-tiny" onClick={() => sell(market.id, "no")}>
                    Close
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
