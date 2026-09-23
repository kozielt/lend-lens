import "server-only";

/** Server-only on purpose: importing this from a 'use client' file fails the build. */
export function serverFacts(): string {
  return `rendered by Node ${process.version}; typeof window = ${typeof window}`;
}
