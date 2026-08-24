export type PropertyCategory = "residential" | "commercial";
export type PropertySubtype = "Residential" | "Office" | "Retail" | "Industrial" | "Mixed-Use";

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
  rarity: "common" | "uncommon" | "rare";
  mapX: number;
  mapY: number;
}

/** World-space [x, z] on the Central Ohio disc. */
export const MAP_TILES: Record<string, [number, number]> = {
  "Short North": [-0.8, 0.6],
  "German Village": [0.4, -1.2],
  Downtown: [0, 0],
  "New Albany": [3.8, 2.4],
  "Polaris Fashion District": [1.6, 3.2],
  "Rickenbacker Corridor": [2.2, -3.0],
  Clintonville: [-1.4, 2.0],
  "Arena District": [-0.6, 0.3],
  "Dublin Bridge Street": [-3.2, 2.6],
  "Upper Arlington": [-2.4, 1.4],
  Franklinton: [-1.8, -1.0],
  "Groveport Logistics Park": [3.0, -3.4],
  Bexley: [2.6, 0.4],
  "Grandview Heights": [-2.8, 0.2],
  Easton: [3.4, 1.2],
  "Hilliard Tech Park": [-4.0, 1.0],
};

export const TOTAL_TILES = Object.keys(MAP_TILES).length;

export const PROPERTY_CARDS: PropertyCard[] = [
  {
    id: "short-north-condo",
    name: "Short North Condo Block",
    neighborhood: "Short North",
    category: "residential",
    subtype: "Residential",
    cost: 180,
    baseRent: 12,
    ability: "On play: +4¢ bias to Short North inventory markets",
    abilityKey: "bias-short-north",
    rarity: "uncommon",
    mapX: 48,
    mapY: 42,
  },
  {
    id: "german-village-row",
    name: "German Village Brick Row",
    neighborhood: "German Village",
    category: "residential",
    subtype: "Residential",
    cost: 160,
    baseRent: 11,
    ability: "Passive: +1 rent for every other residential you own",
    abilityKey: "adjacency-residential",
    rarity: "common",
    mapX: 52,
    mapY: 55,
  },
  {
    id: "downtown-office",
    name: "Downtown Office Tower",
    neighborhood: "Downtown",
    category: "commercial",
    subtype: "Office",
    cost: 320,
    baseRent: 22,
    ability: "On play: conversion-incentive pressure on Office markets",
    abilityKey: "conversion-pressure",
    rarity: "rare",
    mapX: 50,
    mapY: 48,
  },
  {
    id: "new-albany-campus",
    name: "New Albany / Intel Corridor Site",
    neighborhood: "New Albany",
    category: "commercial",
    subtype: "Office",
    cost: 380,
    baseRent: 28,
    ability: "While owned: Intel-timeline markets cannot crash below 35¢",
    abilityKey: "intel-floor",
    rarity: "rare",
    mapX: 72,
    mapY: 28,
  },
  {
    id: "polaris-retail",
    name: "Polaris Fashion Anchor",
    neighborhood: "Polaris Fashion District",
    category: "commercial",
    subtype: "Retail",
    cost: 240,
    baseRent: 16,
    ability: "On play: +6¢ to all Retail foot-traffic markets this session",
    abilityKey: "retail-boost",
    rarity: "uncommon",
    mapX: 58,
    mapY: 22,
  },
  {
    id: "rickenbacker-logistics",
    name: "Rickenbacker Distribution Hub",
    neighborhood: "Rickenbacker Corridor",
    category: "commercial",
    subtype: "Industrial",
    cost: 290,
    baseRent: 20,
    ability: "Passive: Logistics Boom events grant double Axis Coin",
    abilityKey: "logistics-double",
    rarity: "uncommon",
    mapX: 62,
    mapY: 72,
  },
  {
    id: "clintonville-bungalow",
    name: "Clintonville Bungalow Court",
    neighborhood: "Clintonville",
    category: "residential",
    subtype: "Residential",
    cost: 140,
    baseRent: 9,
    ability: "Cheap entry. On play: +50 Axis Coin",
    abilityKey: "starter-boost",
    rarity: "common",
    mapX: 45,
    mapY: 32,
  },
  {
    id: "arena-district-mixed",
    name: "Arena District Mixed-Use",
    neighborhood: "Arena District",
    category: "commercial",
    subtype: "Mixed-Use",
    cost: 350,
    baseRent: 24,
    ability: "Counts as both Residential and Commercial for Dominion",
    abilityKey: "dual-count",
    rarity: "rare",
    mapX: 47,
    mapY: 46,
  },
  {
    id: "dublin-bridge",
    name: "Dublin Bridge Street Retail",
    neighborhood: "Dublin Bridge Street",
    category: "commercial",
    subtype: "Retail",
    cost: 210,
    baseRent: 14,
    ability: "On play: raise commercial average YES by 3¢ for 8 ticks",
    abilityKey: "com-avg-bump",
    rarity: "common",
    mapX: 28,
    mapY: 25,
  },
  {
    id: "upper-arlington",
    name: "Upper Arlington Estate Lot",
    neighborhood: "Upper Arlington",
    category: "residential",
    subtype: "Residential",
    cost: 260,
    baseRent: 18,
    ability: "High-value residential. Passive +2 rent while metro supply is tight",
    abilityKey: "tight-supply-rent",
    rarity: "uncommon",
    mapX: 35,
    mapY: 35,
  },
  {
    id: "franklinton-arts",
    name: "Franklinton Arts Warehouse",
    neighborhood: "Franklinton",
    category: "commercial",
    subtype: "Mixed-Use",
    cost: 175,
    baseRent: 11,
    ability: "On play: fire a one-time Inventory Surge on residential tape",
    abilityKey: "counter-surge",
    rarity: "common",
    mapX: 42,
    mapY: 58,
  },
  {
    id: "groveport-industrial",
    name: "Groveport Logistics Park",
    neighborhood: "Groveport Logistics Park",
    category: "commercial",
    subtype: "Industrial",
    cost: 270,
    baseRent: 19,
    ability: "Industrial synergy: +3 rent if you also own Rickenbacker",
    abilityKey: "industrial-synergy",
    rarity: "uncommon",
    mapX: 68,
    mapY: 78,
  },
  {
    id: "bexley-tudor",
    name: "Bexley Tudor Court",
    neighborhood: "Bexley",
    category: "residential",
    subtype: "Residential",
    cost: 220,
    baseRent: 15,
    ability: "On play: +3¢ bias to metro housing-supply markets",
    abilityKey: "bias-metro",
    rarity: "uncommon",
    mapX: 64,
    mapY: 46,
  },
  {
    id: "grandview-loft",
    name: "Grandview Heights Loft Row",
    neighborhood: "Grandview Heights",
    category: "residential",
    subtype: "Residential",
    cost: 170,
    baseRent: 11,
    ability: "Passive: +1 rent for every retail property you own",
    abilityKey: "retail-adjacency",
    rarity: "common",
    mapX: 32,
    mapY: 48,
  },
  {
    id: "easton-town",
    name: "Easton Town Center Block",
    neighborhood: "Easton",
    category: "commercial",
    subtype: "Retail",
    cost: 310,
    baseRent: 21,
    ability: "On play: +5¢ to retail traffic and commercial average",
    abilityKey: "easton-cluster",
    rarity: "rare",
    mapX: 70,
    mapY: 36,
  },
  {
    id: "hilliard-flex",
    name: "Hilliard Tech Flex Campus",
    neighborhood: "Hilliard Tech Park",
    category: "commercial",
    subtype: "Industrial",
    cost: 250,
    baseRent: 17,
    ability: "Passive: +2 rent while Logistics Boom is priced above 55¢",
    abilityKey: "logistics-rent",
    rarity: "uncommon",
    mapX: 22,
    mapY: 40,
  },
];

export const STARTER_HAND_IDS = [
  "clintonville-bungalow",
  "german-village-row",
  "dublin-bridge",
];

export const cardById = (id: string) => PROPERTY_CARDS.find((c) => c.id === id);

export function fisherYates<T>(items: T[], rand: () => number = Math.random): T[] {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}
