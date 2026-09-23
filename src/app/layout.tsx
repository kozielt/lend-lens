import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Lend Lens", template: "%s · Lend Lens" },
  description: "A DeFi lending dashboard (live markets and wallet health factors) built to learn Next.js 16 caching, streaming and Partial Prerendering.",
};

/**
 * Root layout: a Server Component with no data dependency, so it is part of the static
 * shell of every page. Under Cache Components that shell is what the CDN serves first.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border">
          <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold tracking-tight">
              Lend <span className="text-accent">Lens</span>
            </Link>
            <Link href="/" className="text-muted hover:text-foreground">Markets</Link>
            <Link href="/wallet" className="text-muted hover:text-foreground">Wallet</Link>
            <Link href="/lab" className="text-muted hover:text-foreground">Lab</Link>
            <Link href="/api/reserves/1" className="text-muted hover:text-foreground">API</Link>
            <span className="ml-auto font-mono text-xs text-muted">Aave V3 · Ethereum · Next.js 16</span>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted">
          Public data from api.v3.aave.com and a keyless Ethereum RPC. Not financial advice, not affiliated with Aave.
        </footer>
      </body>
    </html>
  );
}
