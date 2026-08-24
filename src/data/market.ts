export interface MarketContract {
  id: string;
  name: string;
  question: string;
  sector: "residential" | "office" | "retail" | "industrial" | "intel" | "metro" | "commercial";
  yesCents: number;
  fairCents: number;
  history: number[];
}

export interface Position {
  marketId: string;
  side: "yes" | "no";
  shares: number;
  avgCents: number;
}

export interface TempEffect {
  id: string;
  kind: "bias" | "floor" | "comBump" | "retailBoost";
  marketId?: string;
  amount: number;
  ticksLeft: number | null;
}

export const MARKET_DEFS: Omit<MarketContract, "yesCents" | "fairCents" | "history">[] = [
  {
    id: "sn-inventory",
    name: "Short North inventory",
    question: "Will Short North condo inventory stay under two months?",
    sector: "residential",
  },
  {
    id: "office-conversion",
    name: "Office conversion",
    question: "Will downtown Class B conversion incentives clear this window?",
    sector: "office",
  },
  {
    id: "intel-timeline",
    name: "Intel New Albany",
    question: "Will the Intel Ohio fab hit a volume-production print?",
    sector: "intel",
  },
  {
    id: "retail-traffic",
    name: "Retail foot traffic",
    question: "Will Polaris / Easton weekend traffic beat the 2019 baseline?",
    sector: "retail",
  },
  {
    id: "logistics-boom",
    name: "Logistics boom",
    question: "Will Rickenbacker air-cargo volumes print a new high?",
    sector: "industrial",
  },
  {
    id: "metro-supply",
    name: "Metro housing supply",
    question: "Will Franklin County remain a seller's market?",
    sector: "metro",
  },
  {
    id: "com-average",
    name: "Commercial average",
    question: "Will the commercial YES tape close above 50¢ this cycle?",
    sector: "commercial",
  },
];

export function seedMarkets(): MarketContract[] {
  const opens: Record<string, number> = {
    "sn-inventory": 48,
    "office-conversion": 41,
    "intel-timeline": 52,
    "retail-traffic": 46,
    "logistics-boom": 50,
    "metro-supply": 57,
    "com-average": 44,
  };
  return MARKET_DEFS.map((def) => {
    const open = opens[def.id] ?? 50;
    return {
      ...def,
      yesCents: open,
      fairCents: open,
      history: [open],
    };
  });
}

export function clampCents(n: number): number {
  return Math.max(5, Math.min(95, n));
}

export interface Influence {
  bias: Record<string, number>;
  floor: Record<string, number>;
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
      history: [...m.history, yes].slice(-36),
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
    next = positions.map((p) =>
      p === existing ? { ...p, shares: totalShares, avgCents: avg } : p,
    );
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
