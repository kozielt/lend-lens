/** A tiny class used by the boundary drill. No directive: importable from server and client. */
export class Money {
  constructor(readonly amount: string, readonly symbol: string) {}
  label(): string {
    return `${this.amount} ${this.symbol}`;
  }
}
