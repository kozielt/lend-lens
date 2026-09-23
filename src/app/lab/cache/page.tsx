import { Suspense } from "react";
import { stamp, stampClosure, stampPrivate, stampShort, type Stamp } from "@/lib/lab/cache";
import { refreshLab, revalidateLabSwr, toggleLabTheme } from "./actions";
import { RefreshButton } from "@/components/RefreshButton";
import { Case, Mode, Skeleton, Stat } from "@/components/ui";

/**
 * What makes a 'use cache' key. Cards (a), (b) and the `minutes` half of (d) are cached entries in
 * the prerendered shell; (c) private and the `seconds` half of (d) are holes streamed per request.
 * Check with `next build && next start` (dev never caches): reload and compare `#n` and times.
 */
export default function CacheLabPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">What makes a cache key</h1>
        <p className="text-sm text-muted">
          Each stamp shows its run number <code>#n</code> and time. Same number on reload = cache hit. <Mode kind="static" />
        </p>
      </div>

      <Case
        title="(a) Arguments are the key"
        tried={<code>stamp(&apos;A&apos;), stamp(&apos;B&apos;), stamp(&apos;A&apos;)</code>}
        said="two entries (A, B); the third call is a hit on A"
        fix="Key = build id + function id + serialized arguments. Pass what varies as an argument."
      >
        <Suspense fallback={<Skeleton rows={2} />}>
          <Stamps load={() => Promise.all([stamp("A"), stamp("B"), stamp("A")])} names={["stamp('A')", "stamp('B')", "stamp('A') again"]} />
        </Suspense>
      </Case>

      <Case
        title="(b) Closed-over variables are the key too"
        tried={<code>const inner = async () =&gt; {"{ 'use cache'; … who … }"}</code>}
        said="no arguments, yet 'alice' and 'bob' get separate entries"
        fix="Next binds captured variables as hidden arguments. Anything the closure reads is in the key, so keep captures small and serializable."
      >
        <Suspense fallback={<Skeleton rows={2} />}>
          <Stamps load={() => Promise.all([stampClosure("alice"), stampClosure("bob"), stampClosure("alice")])} names={["who = alice", "who = bob", "who = alice again"]} />
        </Suspense>
      </Case>

      <Case
        title="(c) A private cache may read cookies"
        tried={<code>&apos;use cache: private&apos; + cookies().get(&apos;lab-theme&apos;)</code>}
        said="allowed; runs per request, excluded from the static shell, never stored on the server"
        fix="Render it under <Suspense>. The cookie is set by a Server Function (the button), the only place besides a Route Handler that may set one."
      >
        <Suspense fallback={<Skeleton rows={2} />}>
          <PrivateStamp />
        </Suspense>
      </Case>

      <Case
        title="(d) Tag versus time"
        tried={<code>cacheLife(&apos;minutes&apos;) next to cacheLife(&apos;seconds&apos;), both tagged &apos;lab&apos;</code>}
        said="'seconds' (expire 1 min) is too short to prerender: it becomes a streamed hole"
        fix={
          <>
            Time: <code>seconds</code> (a per-request hole) re-runs on the first load after 1 s; <code>minutes</code> sits in the shell and refreshes in the background after 1 min.
            Tag: <code>updateTag</code> expires now and this response shows fresh stamps; <code>revalidateTag(&apos;lab&apos;, &apos;max&apos;)</code> only marks
            them stale, so you see the old stamps once more and new ones on the next load.
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Suspense fallback={<Skeleton rows={2} />}>
            <Stamps load={() => Promise.all([stamp("A")])} names={["minutes · stamp('A')"]} />
          </Suspense>
          <Suspense fallback={<Skeleton rows={2} />}>
            <ShortStamp />
          </Suspense>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <RefreshButton action={refreshLab} label="updateTag('lab')" />
          <RefreshButton action={revalidateLabSwr} label="revalidateTag('lab', 'max')" />
        </div>
      </Case>

      <Case
        title="(e) cookies() inside a plain 'use cache'"
        tried={<code>async () =&gt; {"{ 'use cache'; (await cookies()).get('lab-theme') }"}</code>}
        said={COOKIES_IN_CACHE_ERROR}
        fix="Read the cookie outside and pass the value as an argument (it joins the key), or use 'use cache: private' as in (c). Not shipped; see NOTES.md."
      />
    </div>
  );
}

const COOKIES_IN_CACHE_ERROR =
  "Route /lab/cache/… used `cookies()` inside \"use cache\". Accessing Dynamic data sources inside a cache scope is not supported. (docs: next-request-in-use-cache)";

function StampStat({ name, s }: { name: string; s: Stamp }) {
  return <Stat label={name} value={`#${s.n}`} hint={<>{s.label} · {s.at.slice(11, 23)} UTC</>} />;
}

async function Stamps({ load, names }: { load: () => Promise<Stamp[]>; names: string[] }) {
  const stamps = await load();
  return (
    <div className="space-y-2">
      <Mode kind="cached" />
      <div className="grid gap-3 md:grid-cols-3">
        {stamps.map((s, i) => (
          <StampStat key={i} name={names[i]} s={s} />
        ))}
      </div>
    </div>
  );
}

async function PrivateStamp() {
  const s = await stampPrivate();
  return (
    <div className="space-y-2">
      <Mode kind="live" at={s.at} />
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="lab-theme cookie" value={s.theme} />
        <StampStat name="private" s={s} />
      </div>
      <RefreshButton action={toggleLabTheme} label="Toggle cookie" />
    </div>
  );
}

async function ShortStamp() {
  const s = await stampShort();
  return (
    <div className="space-y-2">
      <Mode kind="live" />
      <StampStat name="seconds · stampShort()" s={s} />
    </div>
  );
}
