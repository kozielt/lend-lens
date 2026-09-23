"use client";

import { Money } from "./money";

/** Gets plain data and rebuilds the class instance on this side. */
export function MoneyView({ data }: { data: { amount: string; symbol: string } }) {
  const money = new Money(data.amount, data.symbol);
  return (
    <p className="font-mono text-xs">
      rebuilt: {money.label()} · instanceof Money: {String(money instanceof Money)}
    </p>
  );
}
