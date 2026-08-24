import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { DRAW_COST, UPGRADE_COST, LOAN_AMOUNT, LOAN_INTEREST } from "./types";
import type { EmpireState, MarketSide } from "./types";
import { PROPERTY_CARDS, cardById, seasonFor } from "./data";
import {
  allClaimed,
  applyEvent,
  applyTicks,
  buyPosition,
  cardMap,
  computeDominion,
  computeRent,
  influenceFrom,
  maybeStress,
  maybeTerminal,
  netWorth,
  ownerOf,
  pickEvent,
  placeCost,
  pushLog,
  pushToast,
  resolvePlay,
  rivalAct,
  sellPosition,
  upgradeCost,
} from "./sim";
import { clearEmpire, hasProgress, loadEmpire, newEmpire, persistEmpire } from "./save";
import {
  resumeAudio,
  setMuted,
  sfxCoin,
  sfxDraw,
  sfxError,
  sfxEvent,
  sfxLose,
  sfxPlace,
  sfxSelect,
  sfxTakeover,
  sfxTick,
  sfxWin,
  unlockAudio,
} from "./audio";

export interface EmpireStore extends EmpireState {
  hydrated: boolean;
  marketOpen: boolean;
  hydrate: () => void;
  start: (fresh: boolean) => void;
  continueFromBriefing: () => void;
  selectCard: (id: string | null) => void;
  placeOnTile: (neighborhood: string) => void;
  collectRent: () => void;
  drawCard: () => void;
  tickTape: () => void;
  buy: (marketId: string, side: MarketSide, stake: number) => void;
  sell: (marketId: string, side: MarketSide) => void;
  takeLoan: () => void;
  repayLoan: () => void;
  upgradeOwned: (cardId: string) => void;
  inspect: (hood: string | null) => void;
  dismissEvent: () => void;
  dismissToast: (id: number) => void;
  acknowledgeWin: () => void;
  setMarketOpen: (open: boolean) => void;
  toggleMute: () => void;
}

function flush(state: EmpireState) {
  persistEmpire(state);
}

export const useEmpire = create<EmpireStore>((set, get) => ({
  ...newEmpire(),
  hydrated: false,
  marketOpen: false,

  hydrate: () => {
    const loaded = loadEmpire();
    set({ ...loaded, hydrated: true, toasts: [] });
    if (loaded.muted) setMuted(true);
  },

  start: (fresh) => {
    unlockAudio();
    resumeAudio();
    if (fresh) {
      clearEmpire();
      const next = { ...newEmpire(), phase: "briefing" as const, hydrated: true };
      set({ ...next, marketOpen: false });
      flush(next);
      return;
    }
    set((s) => {
      const next: EmpireState = {
        ...s,
        phase: s.ownedIds.length || s.cycle > 1 ? "playing" : "briefing",
      };
      flush(next);
      return next;
    });
  },

  continueFromBriefing: () => {
    set((s) => {
      const next = pushLog({ ...s, phase: "playing" }, "The books are open. Claim the river.");
      flush(next);
      return next;
    });
  },

  selectCard: (id) => {
    sfxSelect();
    set({ selectedId: id, inspectHood: null });
  },

  placeOnTile: (neighborhood) => {
    const s = get();
    if (s.phase !== "playing") return;
    const card = PROPERTY_CARDS.find((c) => c.id === s.selectedId);
    if (!card) {
      sfxError();
      set(pushToast(s, "Select a card in your hand first.", "warn"));
      return;
    }
    if (!s.handIds.includes(card.id)) return;
    if (card.neighborhood !== neighborhood) {
      sfxError();
      set(pushLog(s, `${card.name} can only close in ${card.neighborhood}.`));
      return;
    }
    const who = ownerOf(s, neighborhood);
    if (who === "player") {
      set({ inspectHood: neighborhood });
      return;
    }
    const takeover = who !== null;
    const cost = placeCost(card, takeover);
    if (s.coin < cost) {
      sfxError();
      set(pushToast(pushLog(s, `Need ${cost} Axis Coin to close ${card.name}.`), "Not enough coin.", "warn"));
      return;
    }

    const played = resolvePlay(card);
    let rivals = s.rivals;
    if (takeover) {
      rivals = rivals.map((r) =>
        r.id === who ? { ...r, ownedIds: r.ownedIds.filter((id) => cardById(id)?.neighborhood !== neighborhood) } : r,
      );
    }
    let next: EmpireState = {
      ...s,
      coin: s.coin - cost + played.coinDelta,
      handIds: s.handIds.filter((id) => id !== card.id),
      ownedIds: [...s.ownedIds, card.id],
      selectedId: s.handIds.find((id) => id !== card.id) ?? null,
      effects: [...s.effects, ...played.effects],
      rivals,
      lastPlaceHood: neighborhood,
      lastPlaceAt: performance.now(),
      inspectHood: neighborhood,
    };
    next = applyTicks(next, 2, played.shock);
    next = pushLog(next, takeover ? `Hostile takeover. ${played.log}` : played.log);
    next = pushToast(next, takeover ? `Took ${neighborhood}` : `Placed ${card.name}`, takeover ? "warn" : "gold");
    next = maybeTerminal(next);
    if (takeover) sfxTakeover();
    else sfxPlace();
    if (played.coinDelta > 0) sfxCoin();
    set(next);
    flush(next);
  },

  collectRent: () => {
    const s = get();
    if (s.phase !== "playing") return;
    const cards = cardMap(s.ownedIds);
    if (cards.length === 0) {
      sfxError();
      set(pushToast(s, "No holdings yet — place a card on the map.", "warn"));
      return;
    }
    const inf = influenceFrom(cards, s.effects);
    const income = computeRent(cards, s.markets, s.upgrades, inf.rentMult);
    let interest = 0;
    if (s.loan > 0) interest = Math.round(s.loan * LOAN_INTEREST);
    let next: EmpireState = {
      ...s,
      coin: s.coin + income - interest,
      cycle: s.cycle + 1,
      drewThisCycle: false,
      inspectHood: null,
    };
    next = applyTicks(next, 6);
    const acted = rivalAct(next);
    next = acted.state;
    for (const note of acted.notes) next = pushLog(next, note);
    const event = pickEvent(next.cycle);
    if (event) {
      next = applyEvent(next, event);
      sfxEvent();
    }
    next = maybeStress(next);
    const season = seasonFor(next.cycle);
    next = pushLog(next, `Collected ${income} rent. ${season}, cycle ${next.cycle}.${interest ? ` Debt service ${interest}.` : ""}`);
    next = pushToast(next, `+${income} rent`, "gold");
    next = maybeTerminal(next);
    sfxCoin();
    if (next.phase === "won") sfxWin();
    if (next.phase === "lost") sfxLose();
    set(next);
    flush(next);
  },

  drawCard: () => {
    const s = get();
    if (s.phase !== "playing") return;
    if (s.drewThisCycle) {
      set(pushToast(s, "Already drew this cycle.", "warn"));
      return;
    }
    if (s.deckIds.length === 0) {
      set(pushToast(s, "The acquisition stack is empty.", "warn"));
      return;
    }
    if (s.coin < DRAW_COST) {
      sfxError();
      set(pushToast(s, `Drawing costs ${DRAW_COST} Axis Coin.`, "warn"));
      return;
    }
    const [id, ...rest] = s.deckIds;
    if (!id) return;
    const card = cardById(id);
    let next: EmpireState = {
      ...s,
      coin: s.coin - DRAW_COST,
      deckIds: rest,
      handIds: [...s.handIds, id],
      selectedId: id,
      drewThisCycle: true,
    };
    next = pushLog(next, `Drew ${card?.name ?? "a card"} for ${DRAW_COST} coin.`);
    sfxDraw();
    set(next);
    flush(next);
  },

  tickTape: () => {
    sfxTick();
    set((s) => applyTicks(s, 1));
  },

  buy: (marketId, side, stake) => {
    const s = get();
    const market = s.markets.find((m) => m.id === marketId);
    if (!market) return;
    const amt = Math.min(stake, s.coin);
    const res = buyPosition(s.positions, marketId, side, amt, market.yesCents);
    if (!res) {
      sfxError();
      return;
    }
    sfxTick();
    const next = pushLog(
      { ...s, positions: res.positions, coin: s.coin - res.spent },
      `Bought ${res.shares.toFixed(2)} ${side.toUpperCase()} on ${market.name} @ ${market.yesCents.toFixed(1)}¢`,
    );
    set(next);
    flush(next);
  },

  sell: (marketId, side) => {
    const s = get();
    const market = s.markets.find((m) => m.id === marketId);
    if (!market) return;
    const res = sellPosition(s.positions, marketId, side, market.yesCents);
    if (!res) return;
    sfxCoin();
    const next = pushLog(
      { ...s, positions: res.positions, coin: s.coin + res.proceeds },
      `Closed ${side.toUpperCase()} on ${market.name} for ${res.proceeds} coin`,
    );
    set(next);
    flush(next);
  },

  takeLoan: () => {
    const s = get();
    if (s.loan > 0) {
      set(pushToast(s, "A note is already on the books.", "warn"));
      return;
    }
    sfxCoin();
    const next = pushLog(
      pushToast({ ...s, coin: s.coin + LOAN_AMOUNT, loan: LOAN_AMOUNT }, `Drew ${LOAN_AMOUNT} against the books`, "gold"),
      `Took a ${LOAN_AMOUNT} note at ${Math.round(LOAN_INTEREST * 100)}%.`,
    );
    set(next);
    flush(next);
  },

  repayLoan: () => {
    const s = get();
    if (s.loan <= 0) return;
    if (s.coin < s.loan) {
      sfxError();
      set(pushToast(s, "Not enough coin to clear the note.", "warn"));
      return;
    }
    const next = pushLog({ ...s, coin: s.coin - s.loan, loan: 0 }, "Note repaid.");
    set(next);
    flush(next);
  },

  upgradeOwned: (cardId) => {
    const s = get();
    const level = s.upgrades[cardId] ?? 0;
    const cost = upgradeCost(level);
    if (cost == null) return;
    if (s.coin < cost) {
      sfxError();
      set(pushToast(s, `Upgrade costs ${cost}.`, "warn"));
      return;
    }
    const nextLevel = level + 1;
    sfxPlace();
    const next = pushLog(
      pushToast(
        { ...s, coin: s.coin - cost, upgrades: { ...s.upgrades, [cardId]: nextLevel } },
        `Renovated to tier ${nextLevel + 1}`,
        "good",
      ),
      `Renovated ${cardById(cardId)?.name ?? "holding"} (tier ${nextLevel + 1}).`,
    );
    set(next);
    flush(next);
  },

  inspect: (hood) => set({ inspectHood: hood }),
  dismissEvent: () => set({ pendingEvent: null }),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  acknowledgeWin: () =>
    set((s) => {
      const next = { ...s, phase: "playing" as const, winAcknowledged: true };
      flush(next);
      return next;
    }),
  setMarketOpen: (open) => set({ marketOpen: open }),
  toggleMute: () => {
    const next = !get().muted;
    setMuted(next);
    set({ muted: next });
  },
}));

export function useDerived() {
  const slice = useEmpire(
    useShallow((s) => {
      const ownedCards = cardMap(s.ownedIds);
      const inf = influenceFrom(ownedCards, s.effects);
      return {
        handIds: s.handIds,
        ownedIds: s.ownedIds,
        selectedId: s.selectedId,
        dominion: computeDominion(ownedCards),
        rent: computeRent(ownedCards, s.markets, s.upgrades, inf.rentMult),
        worth: netWorth(s),
        season: seasonFor(s.cycle),
        hasSave: hasProgress(s),
        cycle: s.cycle,
        coin: s.coin,
      };
    }),
  );
  const ownedCards = cardMap(slice.ownedIds);
  const hand = cardMap(slice.handIds);
  const selected = PROPERTY_CARDS.find((c) => c.id === slice.selectedId) ?? null;
  const influence = influenceFrom(ownedCards, useEmpire.getState().effects);
  const claimed = allClaimed(useEmpire.getState());
  return {
    ...slice,
    ownedCards,
    hand,
    selected,
    influence,
    claimed,
  };
}

export { UPGRADE_COST };
