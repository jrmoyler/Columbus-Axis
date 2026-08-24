export type PropertyCategory = "residential" | "commercial";
export type PropertySubtype = "Residential" | "Office" | "Retail" | "Industrial" | "Mixed-Use";
export type Rarity = "common" | "uncommon" | "rare" | "legendary";
export type Fabric =
  | "downtown"
  | "brick"
  | "suburban"
  | "campus"
  | "retail"
  | "industrial"
  | "riverfront"
  | "village"
  | "arena";
export type Phase = "title" | "briefing" | "playing" | "won" | "lost";
export type MarketSide = "yes" | "no";
export type RivalPersonality = "commercial" | "residential";

export interface Neighborhood {
  id: string;
  name: string;
  x: number;
  z: number;
  fabric: Fabric;
}

export interface PropertyCard {
  id: string;
  name: string;
  neighborhood: string;
  category: PropertyCategory;
  subtype: PropertySubtype;
  cost: number;
  baseRent: number;
  ability: string;
  abilityKey: string;
  rarity: Rarity;
  flavor: string;
  art: string;
}

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
  side: MarketSide;
  shares: number;
  avgCents: number;
}

export interface TempEffect {
  id: string;
  kind: "bias" | "floor" | "comBump" | "retailBoost" | "rentMult";
  marketId?: string;
  amount: number;
  ticksLeft: number | null;
}

export interface Influence {
  bias: Record<string, number>;
  floor: Record<string, number>;
  rentMult: number;
}

export interface LogLine {
  t: number;
  text: string;
}

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "gold" | "warn" | "good";
}

export interface RivalState {
  id: string;
  name: string;
  color: string;
  personality: RivalPersonality;
  coin: number;
  ownedIds: string[];
}

export interface GameEvent {
  id: string;
  title: string;
  body: string;
  coinDelta: number;
  shock: Record<string, number>;
  rentMult?: number;
  log: string;
}

export interface EmpireState {
  version: number;
  phase: Phase;
  coin: number;
  cycle: number;
  handIds: string[];
  deckIds: string[];
  ownedIds: string[];
  upgrades: Record<string, number>;
  selectedId: string | null;
  inspectHood: string | null;
  markets: MarketContract[];
  positions: Position[];
  effects: TempEffect[];
  log: LogLine[];
  toasts: Toast[];
  drewThisCycle: boolean;
  loan: number;
  rivals: RivalState[];
  pendingEvent: GameEvent | null;
  survivedStress: boolean;
  stressFired: boolean;
  winAcknowledged: boolean;
  muted: boolean;
  reducedMotion: boolean;
  lastPlaceHood: string | null;
  lastPlaceAt: number;
}

export const DRAW_COST = 40;
export const STRESS_CYCLE = 6;
export const WIN_DOMINION = 60;
export const TAKEOVER_MULT = 1.5;
export const LOAN_AMOUNT = 400;
export const LOAN_INTEREST = 0.12;
export const UPGRADE_COST = [0, 120, 220];
export const SAVE_VERSION = 2;
export const SAVE_KEY = "columbus-axis-save-v2";
