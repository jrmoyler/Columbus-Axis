import { useEmpire, useDerived } from "../store";

export function TitleScreen() {
  const start = useEmpire((s) => s.start);
  const { hasSave } = useDerived();
  return (
    <div className="axis-overlay axis-title">
      <div className="axis-title-card">
        <p className="axis-kicker">Central Ohio · Axis Coin</p>
        <h1>
          The Columbus
          <span>Axis</span>
        </h1>
        <p className="axis-lede">
          Become King of the Buckeye State. Close property on a living map of the
          river, bias the tape with steel in the ground, and hold through the rate shock.
        </p>
        <ul className="axis-rules">
          <li>Select a card, then click its neighborhood on the city.</li>
          <li>Collect rent to advance the season. Rivals will bid against you.</li>
          <li>Trade the Axis Market — your buildings are the bid.</li>
          <li>Survive cycle 6, then take 60% Dominion, the urban core, or 4,800 net worth.</li>
        </ul>
        <div className="axis-title-actions">
          <button type="button" className="axis-btn axis-btn-primary" onClick={() => start(true)}>
            New empire
          </button>
          {hasSave ? (
            <button type="button" className="axis-btn" onClick={() => start(false)}>
              Continue
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Briefing() {
  const go = useEmpire((s) => s.continueFromBriefing);
  return (
    <div className="axis-overlay axis-title">
      <div className="axis-title-card">
        <p className="axis-kicker">Charter</p>
        <h1>The books are open.</h1>
        <p className="axis-lede">
          You start with 1,000 Axis Coin and three sites. Scioto Capital and Buckeye Land
          are already in the market. Place steel. Collect. Do not let them take the river.
        </p>
        <button type="button" className="axis-btn axis-btn-primary" onClick={go}>
          Open the city
        </button>
      </div>
    </div>
  );
}
