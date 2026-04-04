export function CurrencyBadge({ value }: { value: number }) {
  return (
    <div className="currency-badge" title="Котокоины">
      <span className="coin" aria-hidden>CAT</span>
      <span>{value}</span>
    </div>
  );
}

