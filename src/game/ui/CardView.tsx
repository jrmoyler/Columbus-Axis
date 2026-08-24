import type { PropertyCard } from "../types";

export function CardView({
  card,
  selected,
  onSelect,
  compact,
}: {
  card: PropertyCard;
  selected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`axis-card rarity-${card.rarity}${selected ? " is-selected" : ""}${compact ? " is-compact" : ""}`}
      onClick={onSelect}
    >
      <span className="axis-card-art" style={{ backgroundImage: `url(${card.art})` }} />
      <span className="axis-card-shade" />
      <span className="axis-card-body">
        <span className="axis-card-top">
          <span className={`axis-rarity ${card.rarity}`}>{card.rarity}</span>
          <span className="axis-card-cost">{card.cost}</span>
        </span>
        <h3>{card.name}</h3>
        <span className="axis-card-hood">{card.neighborhood}</span>
        {!compact && <p>{card.ability}</p>}
        <span className="axis-card-meta">
          {card.subtype} · {card.baseRent} rent
        </span>
      </span>
    </button>
  );
}
