import {
  EVENTS,
  PROPERTY_CARDS,
  TOTAL_TILES,
  cardById,
} from "./data";
import type {
  EmpireState,
  GameEvent,
  Influence,
  LogLine,
  MarketContract,
  Position,
  PropertyCard,
  RivalState,
  TempEffect,
  Toast,
} from "./types";
import { TAKEOVER_MULT } from "./types";

export function cardMap(ids: string[]): PropertyCard[] {
  return ids.map((id) => cardById(id)).filter((c): c is PropertyCard => Boolean(c));
}

export function ownedRecord(ids: string[]): Record<string, PropertyCard> {
  const rec: Record<string, PropertyCard> = {};
  for (const card of cardMap(ids)) rec[card.neighborhood] = card;
  return rec;
}

export function allClaimed(state: EmpireState): Set<string> {
  const set = new Set<string>();
  for (const card of cardMap(state.ownedIds)) set.add(card.neighborhood);
  for (const rival of state.rivals) {
    for (const card of cardMap(rival.ownedIds)) set.add(card.neighborhood);
  }
  return set;
}

export function ownerOf(state: EmpireState, neighborhood: string): "player" | string | null {
  if (ownedRecord(state.ownedIds)[neighborhood]) return "player";
  for (const rival of state.rivals) {
    if (ownedRecord(rival.ownedIds)[neighborhood]) return rival.id;
  }
  return null;
}

export function computeDominion(owned: PropertyCard[]): number {
  let weight = 0;
  for (const card of owned) weight += card.abilityKey === "dual-count" ? 2 : 1;
  return Math.min(100, (weight / TOTAL_TILES) * 100);
}

export function metroTight(markets: MarketContract[]): boolean {
  return (markets.find((x) => x.id === "metro-supply")?.yesCents ?? 50) >= 52;
}

export function logisticsHot(markets: MarketContract[]): boolean {
  return (markets.find((x) => x.id === "logistics-boom")?.yesCents ?? 50) > 55;
}

export function computeRent(
  owned: PropertyCard[],
  markets: MarketContract[],
  upgrades: Record<string, number> = {},
  rentMult = 1,
): number {
  const residentialish = owned.filter(
    (c) => c.category === "residential" || c.abilityKey === "dual-count",
  ).length;
  const retailCount = owned.filter((c) => c.subtype === "Retail").length;
  const mixedCount = owned.filter((c) => c.subtype === "Mixed-Use").length;
  const hasRickenbacker = owned.some((c) => c.id === "rickenbacker-logistics");
  const hasShortNorth = owned.some((c) => c.neighborhood === "Short North");
  const hasDowntown = owned.some((c) => c.neighborhood === "Downtown");
  const tight = metroTight(markets);
  const boom = logisticsHot(markets);
  let rent = 0;
  for (const card of owned) {
    let r = card.baseRent;
    const up = upgrades[card.id] ?? 0;
    r += up * 4;
    if (card.abilityKey === "adjacency-residential") r += Math.max(0, residentialish - 1);
    if (card.abilityKey === "industrial-synergy" && hasRickenbacker) r += 3;
    if (card.abilityKey === "tight-supply-rent" && tight) r += 2;
    if (card.abilityKey === "retail-adjacency") r += retailCount;
    if (card.abilityKey === "logistics-rent" && boom) r += 2;
    if (card.abilityKey === "short-north-adj" && hasShortNorth) r += 2;
    if (card.abilityKey === "downtown-adj" && hasDowntown) r += 3;
    if (card.abilityKey === "mixed-adjacency") r += mixedCount;
    rent += r;
  }
  return Math.round(rent * rentMult);
}

export function holdingsValue(owned: PropertyCard[], upgrades: Record<string, number>): number {
  return owned.reduce((sum, c) => sum + c.cost + (upgrades[c.id] ?? 0) * 80, 0);
}

export function netWorth(state: EmpireState): number {
  const owned = cardMap(state.ownedIds);
  const mtm = state.positions.reduce((sum, p) => {
    const m = state.markets.find((x) => x.id === p.marketId);
    if (!m) return sum;
    return sum + positionValue(p, m.yesCents);
  }, 0);
  return Math.round(state.coin + holdingsValue(owned, state.upgrades) * 0.55 + mtm - state.loan);
}

export function influenceFrom(owned: PropertyCard[], effects: TempEffect[]): Influence {
  const bias: Record<string, number> = {};
  const floor: Record<string, number> = {};
  let rentMult = 1;
  const add = (id: string, amt: number) => {
    bias[id] = (bias[id] ?? 0) + amt;
  };
  for (const card of owned) {
    if (card.abilityKey === "intel-floor") floor["intel-timeline"] = 35;
  }
  for (const fx of effects) {
    if (fx.kind === "bias" && fx.marketId) add(fx.marketId, fx.amount);
    if (fx.kind === "floor" && fx.marketId) {
      floor[fx.marketId] = Math.max(floor[fx.marketId] ?? 0, fx.amount);
    }
    if (fx.kind === "comBump") add("com-average", fx.amount);
    if (fx.kind === "retailBoost") {
      add("retail-traffic", fx.amount);
      add("com-average", fx.amount * 0.4);
    }
    if (fx.kind === "rentMult") rentMult *= fx.amount;
  }
  return { bias, floor, rentMult };
}

export function resolvePlay(card: PropertyCard): {
  coinDelta: number;
  effects: TempEffect[];
  shock: Record<string, number>;
  log: string;
} {
  const effects: TempEffect[] = [];
  const shock: Record<string, number> = {};
  let coinDelta = 0;
  let log = `Closed ${card.name} in ${card.neighborhood}.`;

  switch (card.abilityKey) {
    case "bias-short-north":
      effects.push({
        id: `${card.id}-bias`,
        kind: "bias",
        marketId: "sn-inventory",
        amount: 4,
        ticksLeft: 12,
      });
      log += " Short North inventory bid +4¢.";
      break;
    case "conversion-pressure":
      shock["office-conversion"] = 8;
      log += " Conversion pressure hits the office tape.";
      break;
    case "retail-boost":
      effects.push({ id: `${card.id}-retail`, kind: "retailBoost", amount: 6, ticksLeft: null });
      log += " Retail traffic bid +6¢ for the session.";
      break;
    case "starter-boost":
      coinDelta = 50;
      log += " Starter subsidy: +50 Axis Coin.";
      break;
    case "osu-boost":
      coinDelta = 40;
      log += " High Street stipend: +40 Axis Coin.";
      break;
    case "com-avg-bump":
      effects.push({ id: `${card.id}-com`, kind: "comBump", amount: 3, ticksLeft: 8 });
      log += " Commercial average lifted +3¢ for 8 ticks.";
      break;
    case "counter-surge":
      shock["sn-inventory"] = 7;
      shock["metro-supply"] = 5;
      log += " Inventory surge prints across residential tape.";
      break;
    case "bias-metro":
      effects.push({
        id: `${card.id}-metro`,
        kind: "bias",
        marketId: "metro-supply",
        amount: 3,
        ticksLeft: 10,
      });
      log += " Metro supply tape bid +3¢.";
      break;
    case "easton-cluster":
      effects.push({ id: `${card.id}-easton`, kind: "retailBoost", amount: 5, ticksLeft: 10 });
      log += " Easton cluster bids retail and commercial tape.";
      break;
    default:
      break;
  }

  return { coinDelta, effects, shock, log };
}

export function tickEffects(effects: TempEffect[]): TempEffect[] {
  return effects
    .map((fx) => (fx.ticksLeft == null ? fx : { ...fx, ticksLeft: fx.ticksLeft - 1 }))
    .filter((fx) => fx.ticksLeft == null || fx.ticksLeft > 0);
}

export function clampCents(n: number): number {
  return Math.max(5, Math.min(95, n));
}

export function tickMarkets(
  markets: MarketContract[],
  influence: Influence,
  shock: Record<string, number> = {},
  rand: () => number = Math.random,
): MarketContract[] {
  return markets.map((m) => {
    const bias = influence.bias[m.id] ?? 0;
    const floor = influence.floor[m.id];
    const hit = shock[m.id] ?? shock["*"] ?? 0;
    let fair = m.fairCents + (rand() - 0.48) * 2.4 + bias * 0.18 + hit;
    fair = clampCents(fair);
    if (floor != null) fair = Math.max(fair, floor);
    let yes = m.yesCents + (fair - m.yesCents) * 0.28 + (rand() - 0.5) * 1.6 + hit * 0.6;
    yes = clampCents(yes);
    if (floor != null) yes = Math.max(yes, floor);
    return {
      ...m,
      fairCents: Math.round(fair * 10) / 10,
      yesCents: Math.round(yes * 10) / 10,
      history: [...m.history, yes].slice(-48),
    };
  });
}

export function positionValue(pos: Position, yesCents: number): number {
  const px = pos.side === "yes" ? yesCents : 100 - yesCents;
  return pos.shares * px;
}

export function buyPosition(
  positions: Position[],
  marketId: string,
  side: "yes" | "no",
  stake: number,
  yesCents: number,
): { positions: Position[]; spent: number; shares: number } | null {
  const px = side === "yes" ? yesCents : 100 - yesCents;
  if (px < 5 || stake < px) return null;
  const shares = Math.floor((stake / px) * 100) / 100;
  const spent = Math.round(shares * px);
  if (spent <= 0 || shares <= 0) return null;
  const existing = positions.find((p) => p.marketId === marketId && p.side === side);
  let next: Position[];
  if (existing) {
    const totalShares = existing.shares + shares;
    const avg = (existing.avgCents * existing.shares + px * shares) / totalShares;
    next = positions.map((p) => (p === existing ? { ...p, shares: totalShares, avgCents: avg } : p));
  } else {
    next = [...positions, { marketId, side, shares, avgCents: px }];
  }
  return { positions: next, spent, shares };
}

export function sellPosition(
  positions: Position[],
  marketId: string,
  side: "yes" | "no",
  yesCents: number,
): { positions: Position[]; proceeds: number } | null {
  const existing = positions.find((p) => p.marketId === marketId && p.side === side);
  if (!existing) return null;
  const proceeds = Math.round(positionValue(existing, yesCents));
  return {
    positions: positions.filter((p) => p !== existing),
    proceeds,
  };
}

export function applyTicks(
  state: EmpireState,
  n: number,
  shock: Record<string, number> = {},
): EmpireState {
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

export function pushLog(state: EmpireState, text: string): EmpireState {
  const line: LogLine = { t: Date.now(), text };
  return { ...state, log: [line, ...state.log].slice(0, 48) };
}

let toastSeq = 1;
export function pushToast(state: EmpireState, text: string, kind: Toast["kind"] = "info"): EmpireState {
  const toast: Toast = { id: toastSeq++, text, kind };
  return { ...state, toasts: [...state.toasts, toast].slice(-6) };
}

export function logisticsOwned(owned: PropertyCard[]): boolean {
  return owned.some((c) => c.abilityKey === "logistics-double");
}

export function urbanCoreOwned(owned: PropertyCard[]): boolean {
  const need = new Set(["Downtown", "Short North", "German Village", "Arena District", "Scioto Mile"]);
  for (const c of owned) need.delete(c.neighborhood);
  return need.size === 0;
}

export function maybeStress(state: EmpireState): EmpireState {
  if (state.stressFired || state.cycle < 6) return state;
  const owned = cardMap(state.ownedIds);
  const shock: Record<string, number> = { "*": -12, "intel-timeline": -8 };
  if (owned.some((c) => c.abilityKey === "intel-floor")) shock["intel-timeline"] = -2;
  let incomeHit = Math.round(computeRent(owned, state.markets, state.upgrades) * 2.6);
  if (logisticsOwned(owned)) {
    const boom = state.markets.find((m) => m.id === "logistics-boom");
    if ((boom?.yesCents ?? 0) >= 50) incomeHit = Math.round(incomeHit * 0.5);
  }
  if (state.loan > 0) incomeHit += Math.round(state.loan * 0.25);
  let next: EmpireState = {
    ...state,
    stressFired: true,
    coin: Math.max(0, state.coin - incomeHit),
    pendingEvent: {
      id: "rate-shock",
      title: "The Rate Shock",
      body: `Mark-to-market bleed ${incomeHit} Axis Coin. Survive this, then take the city.`,
      coinDelta: 0,
      shock,
      log: `Rate shock. Bleed ${incomeHit}.`,
    },
  };
  next = applyTicks(next, 4, shock);
  next.survivedStress = next.coin > 0 && owned.length >= 2;
  next = pushLog(
    next,
    next.survivedStress
      ? `Rate shock. Mark-to-market bleed ${incomeHit}. You held the line.`
      : `Rate shock. Bleed ${incomeHit}. The Axis could not clear.`,
  );
  next = pushToast(next, next.survivedStress ? "You held the line." : "The Axis broke.", next.survivedStress ? "warn" : "warn");
  return next;
}

export function maybeTerminal(state: EmpireState): EmpireState {
  const owned = cardMap(state.ownedIds);
  const dominion = computeDominion(owned);
  if (state.stressFired && !state.survivedStress) return { ...state, phase: "lost" };
  if (state.coin <= 0 && owned.length === 0) return { ...state, phase: "lost" };
  if (state.phase !== "playing" || state.winAcknowledged) return state;
  const worth = netWorth(state);
  const king = urbanCoreOwned(owned);
  if (state.survivedStress && (dominion >= 60 || worth >= 4800 || king)) {
    const why = king
      ? "Urban core locked. The river prices your name."
      : worth >= 4800
        ? "Net worth cleared the tape."
        : "Dominion threshold cleared.";
    return pushLog(pushToast({ ...state, phase: "won" }, "King of the Buckeye State", "good"), why);
  }
  return state;
}

export function pickEvent(cycle: number, rand = Math.random): GameEvent | null {
  if (cycle < 2) return null;
  if (rand() > 0.62) return null;
  const pool = EVENTS.filter((e) => {
    if (e.id === "intel-delay" && cycle < 3) return false;
    if (e.id === "osu-gameday" && cycle % 4 !== 3) return false;
    return true;
  });
  return pool[Math.floor(rand() * pool.length)] ?? null;
}

export function applyEvent(state: EmpireState, event: GameEvent): EmpireState {
  const owned = cardMap(state.ownedIds);
  let coin = state.coin + event.coinDelta;
  let extra = 0;
  if (event.id === "streetscape" && owned.some((c) => c.neighborhood === "Short North")) extra += 80;
  if (event.id === "osu-gameday" && owned.some((c) => c.abilityKey === "osu-boost")) extra += 70;
  if (event.id === "cargo-record" && logisticsOwned(owned)) extra += 90;
  if (event.id === "amazon-expand" && logisticsOwned(owned)) extra += 70;
  if (event.id === "intel-delay" && owned.some((c) => c.abilityKey === "intel-floor")) {
    event = { ...event, shock: { ...event.shock, "intel-timeline": -2 } };
  }
  coin += extra;
  const effects = event.rentMult
    ? [...state.effects, { id: `evt-${event.id}`, kind: "rentMult" as const, amount: event.rentMult, ticksLeft: 6 }]
    : state.effects;
  let next: EmpireState = {
    ...state,
    coin,
    effects,
    pendingEvent: event,
  };
  next = applyTicks(next, 3, event.shock);
  next = pushLog(next, extra ? `${event.log} Bonus ${extra}.` : event.log);
  return next;
}

export function rivalAct(state: EmpireState, rand = Math.random): { state: EmpireState; notes: string[] } {
  const notes: string[] = [];
  const claimed = allClaimed(state);
  const playerOwned = new Set(cardMap(state.ownedIds).map((c) => c.neighborhood));
  let rivals: RivalState[] = state.rivals.map((r) => ({ ...r, ownedIds: [...r.ownedIds] }));

  rivals = rivals.map((rival) => {
    const cards = cardMap(rival.ownedIds);
    const stipend = 55 + computeRent(cards, state.markets, {});
    let coin = rival.coin + stipend;
    const candidates = PROPERTY_CARDS.filter((c) => !claimed.has(c.neighborhood) && !playerOwned.has(c.neighborhood));
    const affordable = candidates.filter((c) => coin >= Math.round(c.cost * 0.82));
    if (affordable.length === 0 || rand() < 0.28) {
      return { ...rival, coin };
    }
    const scored = affordable.map((c) => {
      let s = c.baseRent / Math.max(1, c.cost);
      if (rival.personality === "commercial" && c.category === "commercial") s *= 1.45;
      if (rival.personality === "residential" && c.category === "residential") s *= 1.45;
      if (c.rarity === "rare") s *= 1.1;
      s += rand() * 0.02;
      return { c, s };
    });
    scored.sort((a, b) => b.s - a.s);
    const pick = scored[0]?.c;
    if (!pick) return { ...rival, coin };
    coin -= Math.round(pick.cost * 0.82);
    claimed.add(pick.neighborhood);
    notes.push(`${rival.name} closed ${pick.name}.`);
    return { ...rival, coin, ownedIds: [...rival.ownedIds, pick.id] };
  });

  return { state: { ...state, rivals }, notes };
}

export function placeCost(card: PropertyCard, takeover: boolean): number {
  return takeover ? Math.round(card.cost * TAKEOVER_MULT) : card.cost;
}

export function upgradeCost(level: number): number | null {
  if (level >= 2) return null;
  return level === 0 ? 120 : 220;
}
