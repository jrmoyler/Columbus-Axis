import type { PropertyCard } from "../data/properties";
import { TOTAL_TILES } from "../data/properties";
import type { Influence, MarketContract, TempEffect } from "../data/market";

export function computeDominion(owned: PropertyCard[]): number {
  let weight = 0;
  for (const card of owned) weight += card.abilityKey === "dual-count" ? 2 : 1;
  return Math.min(100, (weight / TOTAL_TILES) * 100);
}

export function metroTight(markets: MarketContract[]): boolean {
  const m = markets.find((x) => x.id === "metro-supply");
  return (m?.yesCents ?? 50) >= 52;
}

export function logisticsHot(markets: MarketContract[]): boolean {
  const m = markets.find((x) => x.id === "logistics-boom");
  return (m?.yesCents ?? 50) > 55;
}

export function computeRent(owned: PropertyCard[], markets: MarketContract[]): number {
  const residentialish = owned.filter(
    (c) => c.category === "residential" || c.abilityKey === "dual-count",
  ).length;
  const retailCount = owned.filter((c) => c.subtype === "Retail").length;
  const hasRickenbacker = owned.some((c) => c.id === "rickenbacker-logistics");
  const tight = metroTight(markets);
  const boom = logisticsHot(markets);
  let rent = 0;
  for (const card of owned) {
    let r = card.baseRent;
    if (card.abilityKey === "adjacency-residential") r += Math.max(0, residentialish - 1);
    if (card.abilityKey === "industrial-synergy" && hasRickenbacker) r += 3;
    if (card.abilityKey === "tight-supply-rent" && tight) r += 2;
    if (card.abilityKey === "retail-adjacency") r += retailCount;
    if (card.abilityKey === "logistics-rent" && boom) r += 2;
    rent += r;
  }
  return Math.round(rent);
}

export function influenceFrom(
  owned: PropertyCard[],
  effects: TempEffect[],
): Influence {
  const bias: Record<string, number> = {};
  const floor: Record<string, number> = {};
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
  }
  return { bias, floor };
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
  let log = `Placed ${card.name} in ${card.neighborhood}.`;

  switch (card.abilityKey) {
    case "bias-short-north":
      effects.push({
        id: `${card.id}-bias`,
        kind: "bias",
        marketId: "sn-inventory",
        amount: 4,
        ticksLeft: 12,
      });
      log += " Short North inventory tape bid +4¢.";
      break;
    case "conversion-pressure":
      shock["office-conversion"] = 8;
      log += " Conversion-incentive pressure hits the office tape.";
      break;
    case "retail-boost":
      effects.push({
        id: `${card.id}-retail`,
        kind: "retailBoost",
        amount: 6,
        ticksLeft: null,
      });
      log += " Retail traffic bid +6¢ for the session.";
      break;
    case "starter-boost":
      coinDelta = 50;
      log += " Starter subsidy: +50 Axis Coin.";
      break;
    case "com-avg-bump":
      effects.push({
        id: `${card.id}-com`,
        kind: "comBump",
        amount: 3,
        ticksLeft: 8,
      });
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
      effects.push({
        id: `${card.id}-easton`,
        kind: "retailBoost",
        amount: 5,
        ticksLeft: 10,
      });
      log += " Easton cluster bids retail and commercial tape.";
      break;
    default:
      break;
  }

  return { coinDelta, effects, shock, log };
}

export function tickEffects(effects: TempEffect[]): TempEffect[] {
  return effects
    .map((fx) =>
      fx.ticksLeft == null ? fx : { ...fx, ticksLeft: fx.ticksLeft - 1 },
    )
    .filter((fx) => fx.ticksLeft == null || fx.ticksLeft > 0);
}

export function logisticsOwned(owned: PropertyCard[]): boolean {
  return owned.some((c) => c.abilityKey === "logistics-double");
}
