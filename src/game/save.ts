import { PROPERTY_CARDS, STARTER_HAND_IDS, fisherYates, seedMarkets, seedRivals } from "./data";
import type { EmpireState } from "./types";
import { SAVE_KEY, SAVE_VERSION } from "./types";

export function newEmpire(): EmpireState {
  const rest = PROPERTY_CARDS.map((c) => c.id).filter((id) => !STARTER_HAND_IDS.includes(id));
  return {
    version: SAVE_VERSION,
    phase: "title",
    coin: 1000,
    cycle: 1,
    handIds: [...STARTER_HAND_IDS],
    deckIds: fisherYates(rest),
    ownedIds: [],
    upgrades: {},
    selectedId: STARTER_HAND_IDS[0] ?? null,
    inspectHood: null,
    markets: seedMarkets(),
    positions: [],
    effects: [],
    log: [{ t: Date.now(), text: "Charter signed. 1,000 Axis Coin on the books." }],
    toasts: [],
    drewThisCycle: false,
    loan: 0,
    rivals: seedRivals(),
    pendingEvent: null,
    survivedStress: false,
    stressFired: false,
    winAcknowledged: false,
    muted: false,
    reducedMotion: false,
    lastPlaceHood: null,
    lastPlaceAt: 0,
  };
}

function migrate(raw: Partial<EmpireState>): EmpireState {
  const base = newEmpire();
  return {
    ...base,
    ...raw,
    version: SAVE_VERSION,
    markets: raw.markets?.length ? raw.markets : base.markets,
    rivals: raw.rivals?.length ? raw.rivals : base.rivals,
    upgrades: raw.upgrades ?? {},
    log: raw.log?.slice(-48) ?? base.log,
    toasts: [],
    pendingEvent: raw.pendingEvent ?? null,
  };
}

export function loadEmpire(): EmpireState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newEmpire();
    const parsed = JSON.parse(raw) as Partial<EmpireState>;
    if (!parsed || typeof parsed !== "object") return newEmpire();
    return migrate(parsed);
  } catch {
    return newEmpire();
  }
}

export function persistEmpire(state: EmpireState) {
  try {
    const blob = JSON.stringify({
      ...state,
      log: state.log.slice(-40),
      toasts: [],
      pendingEvent: state.pendingEvent,
    });
    localStorage.setItem(SAVE_KEY, blob);
    localStorage.setItem(SAVE_KEY + ":bak", blob);
  } catch {
    /* private mode / quota */
  }
}

export function clearEmpire() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasProgress(state: EmpireState): boolean {
  return state.ownedIds.length > 0 || state.cycle > 1 || state.coin !== 1000;
}
