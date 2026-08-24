import { PROPERTY_CARDS, STARTER_HAND_IDS, type PropertyCard } from "../data/properties";
import { seedMarkets, type MarketContract, type Position, type TempEffect } from "../data/market";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "columbus-axis-save-v1";

export type Phase = "title" | "playing" | "won" | "lost";

export interface LogLine {
  t: number;
  text: string;
}

export interface EmpireState {
  version: number;
  phase: Phase;
  coin: number;
  cycle: number;
  handIds: string[];
  deckIds: string[];
  ownedIds: string[];
  selectedId: string | null;
  markets: MarketContract[];
  positions: Position[];
  effects: TempEffect[];
  log: LogLine[];
  drewThisCycle: boolean;
  survivedStress: boolean;
  stressFired: boolean;
  winAcknowledged: boolean;
}

export function cardMap(ids: string[]): PropertyCard[] {
  return ids
    .map((id) => PROPERTY_CARDS.find((c) => c.id === id))
    .filter((c): c is PropertyCard => Boolean(c));
}

export function ownedRecord(ids: string[]): Record<string, PropertyCard> {
  const rec: Record<string, PropertyCard> = {};
  for (const card of cardMap(ids)) rec[card.neighborhood] = card;
  return rec;
}

function shuffleIds(ids: string[]): string[] {
  const next = ids.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

export function newEmpire(): EmpireState {
  const rest = PROPERTY_CARDS.map((c) => c.id).filter((id) => !STARTER_HAND_IDS.includes(id));
  return {
    version: SAVE_VERSION,
    phase: "title",
    coin: 1000,
    cycle: 1,
    handIds: [...STARTER_HAND_IDS],
    deckIds: shuffleIds(rest),
    ownedIds: [],
    selectedId: STARTER_HAND_IDS[0] ?? null,
    markets: seedMarkets(),
    positions: [],
    effects: [],
    log: [{ t: Date.now(), text: "Empire chartered. 1,000 Axis Coin on the books." }],
    drewThisCycle: false,
    survivedStress: false,
    stressFired: false,
    winAcknowledged: false,
  };
}

function migrate(raw: EmpireState): EmpireState {
  const base = newEmpire();
  return {
    ...base,
    ...raw,
    version: SAVE_VERSION,
    markets: raw.markets?.length ? raw.markets : base.markets,
    log: raw.log?.slice(-40) ?? base.log,
  };
}

export function loadEmpire(): EmpireState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newEmpire();
    const parsed = JSON.parse(raw) as EmpireState;
    if (!parsed || typeof parsed !== "object") return newEmpire();
    return migrate(parsed);
  } catch {
    return newEmpire();
  }
}

export function persistEmpire(state: EmpireState) {
  try {
    const blob = JSON.stringify({ ...state, log: state.log.slice(-40) });
    localStorage.setItem(SAVE_KEY, blob);
  } catch {
    /* private mode / quota — keep playing in memory */
  }
}

export function clearEmpire() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
