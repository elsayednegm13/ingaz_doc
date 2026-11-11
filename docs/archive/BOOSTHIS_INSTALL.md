A SANDBOX PREVIEW CANNOT SHOW WHAT THIS KIT DOES: a sandboxed preview, canvas, or artifact environment cannot reach what this kit talks to. Those sandboxes have no network and no access to boosthis.com, so the kit always looks broken there — sign-in and telemetry cannot load, hand-copied icon bytes come out scrambled, and the console errors belong to the mock, not the kit. A preview, mock-up or re-implementation shown as "the Boosthis UI" describes the sandbox rather than the product. Three checks say something real: (1) a passing kit verification (verify_kit_install, or the same check over HTTPS when a tool reply is withheld) — which proves the FILES ON DISK and nothing more, never that anything is measured; (2) opening the REAL running host app, with network access, and looking at the kit's own bubble and dashboard there; and (3) asking Boosthis whether this project key has seen a check-in — the only one of the three that proves the install is finished (closing step of this guide). SANDBOX INSTALL CHECK: a blocked or unreachable package registry (registry.npmjs.org, pypi.org, proxy.golang.org, Maven Central, etc.) is almost always a sandboxed environment rather than the developer's real project. Workarounds do not change that: the install only counts in the real project (Replit, Claude Code, Cursor, or their local machine). Even there the install is unfinished until check (3), which answers from inside a sandbox too and names which of the states the project is in.

## Requirements for this kit

Read from this kit's own files; the same two sections open every Boosthis kit guide.

- **Runtime:** workerd (the Cloudflare Workers runtime) 1.20260825.1 — the lowest version this kit's own tests and proofs have run on (`package.json`).
- **Runtime:** Deno 2 — the lowest version this kit's own tests and proofs have run on (`.replit`).
  No floor is declared: the kit ships no manifest. Nothing older than the versions above has been tried, which means untested, not known to fail.
- **Platforms:** isolate hosts — Cloudflare Workers, Deno and hosted edge functions.
- **What it cannot measure there:** [the runtime coverage table](https://www.boosthis.com/pricing#runtime-coverage), generated from the kits themselves, with the reason under every "Not applicable".

## Install in one command

The complete kit is one archive, `https://www.boosthis.com/api/kit/edge/archive`, sent with your project key as an `Authorization: Bearer` header, and every release of it is signed. The steps save it as `boosthis-edge-kit.tar.gz` with its signed release list and signature, check the signature with `ssh-keygen` against the signers file at https://www.boosthis.com/.well-known/boosthis-kit-release-keys and the archive against the list, list it (`tar -tzf`), unpack it in the project root (`tar -xzf`) and end with the check below; a failed signature check ends them there, with nothing unpacked. The dashboard Setup page prints those lines with the address filled in. If you are reading this inside the unpacked archive, only the check is left to run.

The check, from the project root:

```
sha256sum -c BOOSTHIS_CHECKSUMS.txt          # Linux
shasum -a 256 -c BOOSTHIS_CHECKSUMS.txt  # macOS
```

Windows (PowerShell):

```
$n = 0; $bad = 0; foreach ($l in (Get-Content -LiteralPath BOOSTHIS_CHECKSUMS.txt -ErrorAction Stop)) { if (-not $l) { continue }; $n++; $h, $p = $l -split '  ', 2; $f = Get-FileHash -Algorithm SHA256 -LiteralPath $p -ErrorAction SilentlyContinue; if (-not $f -or $f.Hash -ne $h) { $bad++; "FAILED: $p" } }; "$n checked, $bad failed"; if ($bad) { cmd /c exit 1 }
```

A pass is an OK line for every file but BOOSTHIS_CHECKSUMS.txt itself (PowerShell: "0 failed"); fewer lines than the kit has files, less one, is a short list checking a short kit.

**Fallback, by value.** Where no shell can fetch the archive, the same files arrive by value in this kit's files[]: every entry written to its exact path, `BOOSTHIS_CHECKSUMS.txt` at the project root included, then the check alone — `sha256sum -c BOOSTHIS_CHECKSUMS.txt` (Linux), `shasum -a 256 -c BOOSTHIS_CHECKSUMS.txt` (macOS) or the PowerShell check above (Windows) — from the project root. No Python is needed for any of it.

# Install Boosthis Edge

The source drop belongs at `lib/boosthis-edge/`. Keep every shipped file at its
exact path and import from `./lib/boosthis-edge/src/index.ts` using the correct
relative path from your function entry file.

Set `BOOSTHIS_PROJECT_KEY` to the `bk_...` project key from the Boosthis
dashboard, through the host's own secret or environment-variable setting. The
older name `BOOSTHIS_KEY` is still read, and it wins over `BOOSTHIS_PROJECT_KEY`
when both are set.
Boosthis derives a stable install identity from that key and the function slot;
do not create or store a separate identity. The key is sent as the bearer when
the function registers and uploads.

If this codebase already reports under another project key, set
`BOOSTHIS_PROJECT_KEY_EDGE`: the isolate's own slot wins over the key passed in
code, over `BOOSTHIS_PROJECT_KEY` and over its older name `BOOSTHIS_KEY`, so a
Worker in front of an existing service can report as its own project without
touching that service's settings.

Boosthis deliberately adds no page and no panel to an edge function, so the
function's routes and responses stay its own. The numbers appear on the
Boosthis dashboard.

## 0. Check you have the whole kit

These notes reach you two ways and read the same either way: unpacked
from the `boosthis-kit-<runtime>.tar.gz` archive you downloaded from your
Boosthis dashboard, or handed to you by value over an AI connection. Do
the check that matches what you are actually holding — one of them, not
both.

**If you unpacked an archive**, there is a `BOOSTHIS_CHECKSUMS.txt` beside this
file. From the folder you unpacked into, run:

```sh
sha256sum -c BOOSTHIS_CHECKSUMS.txt
```

On macOS without GNU coreutils, `shasum -a 256 -c BOOSTHIS_CHECKSUMS.txt` does the
same thing. Every line must end in `OK`. On Windows, the same check in
PowerShell is the line below, and a pass ends in `0 failed`:

```powershell
$n = 0; $bad = 0; foreach ($l in (Get-Content -LiteralPath BOOSTHIS_CHECKSUMS.txt -ErrorAction Stop)) { if (-not $l) { continue }; $n++; $h, $p = $l -split '  ', 2; $f = Get-FileHash -Algorithm SHA256 -LiteralPath $p -ErrorAction SilentlyContinue; if (-not $f -or $f.Hash -ne $h) { $bad++; "FAILED: $p" } }; "$n checked, $bad failed"; if ($bad) { cmd /c exit 1 }
```

That is the whole check: it needs no network, no account and no Boosthis
tooling. If a line fails, or the checksum file is not there, the download
was incomplete — fetch the archive again and unpack it into a clean folder.

**If you received a `files[]` array instead**, compare its length with the
`file_count` the same payload carries. A shorter array means the transport
truncated it: write nothing, and fetch the complete kit from
`kit_download_url` instead.

## What this kit adds to your app

Decide this before you ship, not after. Two kinds of thing arrive with
an install: something your users can see, and addresses your app starts
answering.

### What your users see

- Nothing. An isolate function has no screen of its own to draw a bubble on, so this kit adds nothing an end user can see.

### What your app starts answering

- Nothing. The edge kit measures the function it wraps and mounts no address of its own.

The same list for every runtime, alongside what each address returns, is
published at https://www.boosthis.com/docs/what-boosthis-adds.

## Cloudflare Workers

Install Wrangler and point its `main` setting at your module Worker. Keep the
Worker's existing handler body and wrap the exported object:

```ts
import { withBoosthis } from "./lib/boosthis-edge/src/index.ts";

async function handler(request: Request): Promise<Response> {
  return new Response("ok");
}

export default withBoosthis({
  async fetch(req, env, ctx) { return handler(req); }
}, { appName: "my-worker" });
```

This wrapper shape is the one exercised by the real workerd proof. The `env`
and `ctx` arguments must stay on `fetch`: the kit reads the Worker secret from
`env` and gives after-response uploads to `ctx.waitUntil`.

Put the project key in a Worker secret, not in source:

```sh
npx wrangler secret put BOOSTHIS_PROJECT_KEY
npx wrangler dev
```

Paste the dashboard project key when Wrangler prompts. Call the running Worker
once, find the line beginning `[boosthis] edge kit started on Cloudflare
Workers`, then confirm the Edge back end appears on the Boosthis dashboard.
Cloudflare's clock cannot time its own start, so cold start is named there as
unmeasurable rather than shown as zero.

## Deno and Deno Deploy

Keep the existing handler and pass it through `boosthisHandler`:

```ts
import { boosthisHandler } from "./lib/boosthis-edge/src/index.ts";

async function handler(request: Request): Promise<Response> {
  return new Response("ok");
}

Deno.serve(boosthisHandler(handler, { appName: "my-deno-api" }));
```

That `Deno.serve(boosthisHandler(handler, { appName: ... }))` shape is the one
exercised by the real Deno proof. For local Deno, put the project key in the
environment and grant only the permissions the kit needs:

```sh
BOOSTHIS_PROJECT_KEY=bk_... deno run --allow-env=BOOSTHIS_PROJECT_KEY,BOOSTHIS_ENDPOINT,BOOSTHIS_APP_NAME --allow-net main.ts
```

For Deno Deploy, add `BOOSTHIS_PROJECT_KEY` as a project environment variable in the
Deploy dashboard; no command-line permission flags are needed there. Call the
function once, find the line beginning `[boosthis] edge kit started on Deno`,
then confirm the Edge back end appears on the Boosthis dashboard.

## Supabase Edge Functions

Supabase functions run on Deno. Keep the existing `serve` import and wrap the
handler:

```ts
import { serve } from "https://deno.land/std/http/server.ts";
import { boosthisHandler } from "./lib/boosthis-edge/src/index.ts";

async function handler(request: Request): Promise<Response> {
  return new Response("ok");
}

serve(boosthisHandler(handler));
```

Add `BOOSTHIS_PROJECT_KEY` in the Supabase project dashboard under Edge Function
secrets (or use `supabase secrets set BOOSTHIS_PROJECT_KEY=bk_...`). Deploy and call
the function once. Find the line beginning `[boosthis] edge kit started on
Supabase Edge Functions`, then confirm the Edge back end appears on the
Boosthis dashboard. The kit uses `EdgeRuntime.waitUntil` for after-response
work when Supabase provides it.

## Lovable and Base44 hosted edge back ends

These generated hosted functions use the same Deno handler path. In the
function entry file, keep the platform's existing `serve` import and wrap its
existing handler:

```ts
import { serve } from "https://deno.land/std/http/server.ts";
import { boosthisHandler } from "./lib/boosthis-edge/src/index.ts";

async function handler(request: Request): Promise<Response> {
  return new Response("ok");
}

serve(boosthisHandler(handler));
```

Add `BOOSTHIS_PROJECT_KEY` as a secret in that project's platform dashboard. Do not
paste it into source. Publish the back end and call the function once. Find the
line beginning `[boosthis] edge kit started on`, then confirm the Edge back end
appears on the Boosthis dashboard. The kit uses `EdgeRuntime.waitUntil` when
the host provides it.


## Handlers that are not web requests

`withBoosthis` and `boosthisHandler` cover the `fetch` handler and nothing else.
A queue consumer, a `scheduled` handler, an email or tail handler, and a Durable
Object method all run outside that boundary, so their work is not timed and the
calls they make out are not counted. If your worker exports any of them, the
project page lists it as a part we are not watching.

Close the gap by marking the handler. `kind` is one of `queue`, `scheduled`,
`durable-object`, `email` or `tail`:

```ts
import { withBoosthis, boosthisEntryPoint } from "./lib/boosthis-edge/src/index.ts";

export default withBoosthis({
  fetch: handler,
  queue: boosthisEntryPoint("queue", async (batch, env, ctx) => {
    // your existing consumer, unchanged
  }),
});
```

The handler runs exactly as before — same arguments, same return value, and a
failure is re-thrown untouched after being recorded. Each run is timed like a
request and filed under the fixed `kind` you passed, so no handler, binding or
function name of yours travels with that reading. A marked handler stops
being reported as unwatched; an unmarked one keeps being reported, because we
only say a surface is watched once a real run has come through it.

A `scheduled` run is also filed as a background job, so it appears in the
project's list of jobs and on the back half of the map. It is named by the
`job` option when one is given, and otherwise by the cron pattern that fired
it. Deno hands a cron handler no pattern, so a Deno cron is filed only when it
is named:

```ts
Deno.cron("nightly rebuild", "0 3 * * *",
  boosthisEntryPoint("scheduled", rebuild, { job: "nightly-rebuild" }));
```

The marked handler takes the same `appName`, `installId` and `slot` options as
`withBoosthis`; given the same ones, its runs are filed on the same install as
the requests. Four facts travel for each run: that name, how long ago the run
finished, how long it took and whether it worked. The cron pattern is not
turned into a rhythm, so the job is judged against one only when it is set on
the job's page.

## Routes and calls that wait on purpose

A long-poll waits on purpose: a handler that holds the request until there is
news, or one that long-polls another service before it answers (a bot polling
Telegram is held up to 30 seconds a call). The kit times each request until
your handler returns its `Response`, so that wait is timed like a slow answer
and drags every reading built on request times down with it. Only you know
which ones wait on purpose, so you name them, in the options of either wrapper:

```ts
const declaredWaits = {
  routes: ["GET /updates"],                                  // requests this function answers
  calls: ["https://api.telegram.org/bot:token/getUpdates"],  // fetch calls it makes
};

export default withBoosthis({ fetch: handler }, { declaredWaits });   // Cloudflare Workers
Deno.serve(boosthisHandler(handler, { declaredWaits }));              // Deno and hosted edge functions
```

- **Routes** are named as your dashboard shows them: `GET /updates`, or
  `/updates` for every method of that route. The name is also compared with
  the request's own path, so the route you wrote matches even where the
  dashboard shows a segment as `:id`; there a `:name` segment stands for one
  segment that changes. A declared route's time stays out of the score,
  resilience, the latency floor, load deflection, learned budgets, route
  timings, slow-route alerts and traces. Its errors and in-flight counts still
  count. A response that streams needs no declaration here: timing stops when
  the handler returns, before the body is sent.
- **Calls** are named by full address without the query. A segment written
  `:name` stands for exactly one segment that changes — here the bot token, so
  never paste the real one. A declared call's time stays out of the
  outside-service reading and the traces; its failures still count. Calls to an
  AI provider or a hosted database keep the readings they always had. The
  address is compared inside the isolate and never sent: only counts are.
- **Matching is exact.** A wildcard, a prefix, a pattern, a host on its own and
  the kit's own routes are refused, each with its reason in the log. At most 10
  names in each list; a longer list is refused whole, never cut to ten.
- **Nothing is hidden.** A log line beginning `[boosthis] Waits declared on
  purpose` names what you declared. Every call kept out is counted and sent,
  your project page says what you declared and how many calls it kept out,
  and a window where every call was declared reads *nothing judged*, never
  good. There is no time limit that does this by itself: only the names you
  give.

## Proof status

The Cloudflare module-Worker recipe has passed on a real workerd isolate, and
the Deno recipe has passed on real Deno. Both runs include a chain that entered
through the worker: a request arriving with a caller's trace on it, continued
rather than restarted, with the span reaching the receiver from inside the
isolate. Supabase, Lovable, and Base44 use the
same Deno handler and `EdgeRuntime.waitUntil` code path, but we have not
published this kit to those hosted platforms.

## What can be measured

The kit measures reliability, captures unhandled handler crashes, and measures
access pressure, cookie exposure, and cold start. Crash reports contain a
code-derived signature and redacted top frame, never the raw error message.
Set `crashDetails: true` in the wrapper options to additionally upload sanitized
JavaScript frames (function, file basename, generated line, and column) for
source-map resolution.
Cloudflare Workers cannot measure cold start because its clock does not move
until the function performs input or output.

It also watches the isolate's one way out, the platform's `fetch`, and reports
the model-provider calls a request made (count, timings, a spend estimate from
published prices, and the rate-limit headroom each reply declares) and the
database work it did over HTTP (share of the request spent waiting, call count,
and the same statement run twice inside one request). Only databases reached
over HTTP are visible from an isolate; the dashboard says so beside the number.
Both readings are attributed to the request that issued the call and folded in
before the response completes, because an isolate can be frozen the moment it
answers. The kit's own uploads are excluded, no answer, query, or credential
text is sent, and a project that makes no such calls gets no such reading
rather than a zero.

The one exception is the AI-call meter: to tell repeated prompts apart it reads
up to the first 4,096 characters of an outbound request body to an AI provider,
inside your own process, and reduces it immediately to a single number — no
body text is stored, uploaded or recoverable. That happens inside the isolate,
on the way out. It is not the only thing this kit reads inside your process —
the same meter reads the provider's streamed reply for the token counts it
states, the cookie check reads the attributes on the Set-Cookie lines your
worker sends, a fixed list of headers is looked up by name, and the
repeated-work and database readings fold up to 4,096 characters at each end
of a call's query, and of its body when the body is text, into one number, to
tell two different calls to the same address apart — and none of it is stored
or uploaded. It is stated here because the person who decides
whether the trade is acceptable is the developer shipping the worker, not us.

Every request the wrapper handles is recorded as one span, so your worker
appears in the trace waterfall alongside the back ends behind it. If the caller
already started a trace, this worker continues it instead of starting a second
one, so the worker's own hop sits inside the caller's trace rather than in a
rival one. A request that arrives with no trace on it begins a
new one; no caller is ever invented for it. The span carries the same route
label as the rest of the reading — no path of yours travels unredacted — plus
how long the handler took and whether it succeeded.

Spans are recorded while the request is still being handled and are handed to
the host's after-response mechanism, because an isolate can be frozen or
discarded the moment it answers. Cloudflare Workers supplies that mechanism as
the third argument to `fetch`, and Deno-based hosts as
`EdgeRuntime.waitUntil`. If neither is available — on Cloudflare, that means
the recipe was wired as `fetch(request, env)` without passing `ctx` through —
the kit writes one line to your function log saying so: it will still record
spans, samples and crashes, but the upload that carries them away may never be
allowed to run. It says this once, at the point it happens, rather than
appearing to work and leaving an empty waterfall on the dashboard.

Whether the chain carries on past this worker depends on who sends the next
request. A back end that receives the trace headers joins the same trace — that
is what happens when your worker forwards the incoming request with its headers
intact. A request this worker builds for itself does not yet carry the trace
onward, so a back end called that way starts a trace of its own. That is the one
part of the chain this kit does not close.

An isolate exposes no
process event loop, heap reading, garbage-collection counters, CPU clock,
uptime, container, socket table, handle table, or filesystem. Those readings
are named with their reasons on the dashboard; they are never shown as zero or
as still warming up.

## Verify the source drop

Before wiring the kit, count the received `files[]` entries and compare the
count with `file_count`. If fewer arrived, stop and use `kit_install_command`
to download the complete archive. Write every file byte-for-byte at its listed
path. The `verify_kit_install` tool answers for `runtime: "edge"` given the
path and sha256 of every written file. Only a `pass` verdict says the files
on disk are the ones this server shipped; anything the wiring rests on before
that rests on an assumption.

After wiring, make one real request. A startup line proves the wrapper ran; the
dashboard entry proves registration and reporting worked. Downloading or
writing the files alone is not an installation.

## When the project is locked

Each isolate learns whether this project is active from the registration it
already makes. Any other answer (unpaid, revoked or paused, for example), a
send refused by name, or an active answer whose grace has run out stops the
kit in that isolate: it stops measuring and sending, takes its watch off the
function's outgoing calls and error log, and throws away what the isolate
held. Your handler answers as it would without the kit. Only an active answer
brings it back, and an active answer holds for at most seven days. A project
that stays locked past its owner's delay is dissolved: the kit forgets the
install, which lives only in the isolate's memory, and asks nothing more in
that isolate. Nothing is erased on Boosthis, so the project's history is
kept. A new isolate asks again before anything it measured leaves. A copy
installed before this behaviour arrived keeps its old behaviour until the kit
is updated.

## Remove / uninstall

BEFORE YOU START — do not remove the Boosthis connection from your AI tool
until removal is confirmed. The erase step runs over that connection while
this app still holds its own delete credential, so if the connection goes
first there is nothing left to erase this app's data on the Boosthis server
and nothing left to check whether it was erased — the owner is left with an
open question instead of an answer. Take the Boosthis connection out LAST,
after the erase step has run.

IF THE CONNECTION WAS ALREADY REMOVED FIRST — nothing is lost and no support
ticket is needed, because removing it never told Boosthis anything. Add the
Boosthis connection back with the same project key, put the erase call back
if the wiring was already stripped, run it once, then confirm. To confirm at
any time, sign in at https://www.boosthis.com/dashboard and read the Data
erasure list: it shows every erase Boosthis actually carried out, with the
date, and says plainly when no erase ever arrived for a project instead of
presenting silence as gone.

To stop reporting and erase this install's data:

- **Silence the kit, keep the code:** remove `BOOSTHIS_PROJECT_KEY` (and the
  older `BOOSTHIS_KEY`, if it is there) from the function's environment. The
  wrapper stays wired, prints one line saying it has no project key, and sends
  nothing.
- **Erase this install's data:** an isolate keeps nothing between wakes, so
  this kit holds no delete credential of its own and keeps no files to wipe;
  what one instance holds in memory goes when it ends. The project owner
  erases the install's data at https://www.boosthis.com/dashboard by revoking
  the project key it reports under, which deletes the data of every install
  under that key once the countdown the dashboard shows has run out, or by
  closing the account. No button erases one install alone.
- **Uninstall entirely:** unwrap the handler — drop `withBoosthis(...)` or
  `boosthisHandler(...)` and export your own handler again — delete the
  `lib/boosthis-edge` files, and remove `BOOSTHIS_PROJECT_KEY` (or its older
  name `BOOSTHIS_KEY`), `BOOSTHIS_ENDPOINT` and `BOOSTHIS_APP_NAME` from the
  function's environment. Nothing Boosthis-shaped is left in the isolate.

## WHICH PROJECT KEY THIS KIT TAKES

This kit reads its project key from the environment (the shared `BOOSTHIS_PROJECT_KEY` where nothing more specific is wired in), so the key never travels inside anything a user downloads. A normal (`fix`) key covers it: it both registers this project and authenticates the Boosthis AI connection's reads.

The narrower `ship` scope exists for the kits whose key ends up inside a published artifact (the React Native kit, the browser kit, the Flutter kit, the Swift kit and the Kotlin kit). Where a project's key is one, because its website or phone app carries it, server code reports with that same key and the app stays one project. On a server a published-app key registers and uploads; the reads, rule proposals, promise writes and build-map replacement a normal key opens are refused for it. A connection made by signing in carries the reads and the kits instead, and a newly made key for the server would be a new, separate project.

A key committed to a repository is a key in a public artifact from the moment the repository is one, which is the case the environment setting avoids.

## What Boosthis costs your app

PER REQUEST. Measured on 2026-10-30, against the same handler served
directly, with the kit module never imported, installed the way this guide
says (Deno.serve(boosthisHandler(handler)), the line the kit's own guide
gives a Deno developer): each request costs the process 0.034 ms more of its
time — between 0.033 and 0.035 ms across the run's rounds. That is
arithmetic on the two throughputs the rig measured with 4 callers, each
starting its next request the moment the last one answered: 1000 ÷ 12,498.43
requests a second with the kit, minus 1000 ÷ 21,759.92 without it. It is
capacity — how much less work the process gets through — and not the delay
one request feels when nothing else is running, which this rig did not time.

WORST CASE: A ROUTE THAT DOES ALMOST NOTHING. Without the kit, the rig's
route took 0.046 ms of the process's time per request, so the same added
time shows as a 42.56% fall in throughput there. That percentage is the
worst case, not a forecast for your app: a bare health check, doing even
less work, would show the same added time as a larger share. The rig's
verdict on this run is OVER CEILING: it is above the 5% we hold this kit to,
and the breach is recorded here rather than hidden. The run's 3 interleaved
rounds placed that percentage at ±0.72 points.

UNDER LOAD. With the 4 callers running, a request took 0.11 ms longer at the
median and 0.2 ms longer at the 95th percentile. Those latencies include any
time a request spent waiting behind the other callers' requests in the
process, so they describe the process kept busy, not one request on its own.

ON A ROUTE THAT DOES REAL WORK — arithmetic on the figure above, not a
measurement. Where a route takes 5 ms of the process's time per request
without the kit, adding 0.034 ms costs 0.68% of the requests it can serve;
at 20 ms, 0.17%; at 100 ms, 0.034%. The share is added ÷ (time without the
kit + added). That assumes the added time stays the same on heavier work:
the rig's route did a fixed piece of arithmetic and made no database or
network calls, and nothing heavier was measured. A process running near its
CPU limit would feel this, because every added millisecond is time it no
longer has for requests; one running well below that limit has the time to
spare and serves the same traffic.

FIRST REQUESTS. In the window straight after the process started, the kit
cost no measurably different amount per request from once settled, within
the two windows' own ±: 0.037 ms per request (0.031 to 0.044 ms), 42.06% of
throughput, and 0.24 ms added at the 95th percentile.

MEMORY. The same paired arms, with the whole process tree's resident memory
sampled from the kernel while the traffic ran: the kit adds 86.58 MB once
the process has settled (±2.93 MB across the rounds), and 87.08 MB at its
largest single sample — the figure that decides whether a container with a
fixed memory limit survives. Measured 2026-09-25. Resident memory is what
the operating system says the process holds. A runtime that manages its own
heap — the JVM, .NET, the BEAM — answers extra allocation by growing that
heap, so part of a large figure here is the heap responding to the kit's
work rather than the kit's own structures. It is still memory the machine
must have, which is why it is published; it is not a number to read as the
size of the kit.

EVERY RUNTIME, FOR COMPARISON. The same rig, the same workload, the same
kit-absent control, one runtime at a time — time added per request once
settled, and in brackets the throughput that came to on the rig's near-empty
route: Java 0.020 ms (26.28%), Edge isolates (Deno) 0.034 ms (42.56%),
Browser (web page) 0 to 0.094 ms per page operation (3.97%), Go 0.049 ms
(49.36%), .NET 0.053 ms (38.42%), Bun 0.28 ms (76.88%), Node.js 0.39 ms
(78.97%), Rust 0.40 ms (89.42%), Elixir 0.59 ms (86.99%), Ruby 0.80 ms
(45.39%), Python 1.8 ms (61.79%), PHP 4.7 ms (96.01%). Measured on different
days; each runtime's own date is in the record. No figure yet, each with a
written reason and what would take one: React Native, Flutter, Swift / Apple
platforms, Kotlin / Android, Cloudflare Workers (workerd isolate). Nothing
is estimated for those, and nothing here is an average — an average over
runtimes would describe no app that exists.

WHAT THE KIT DOES AND DOES NOT PROMISE. Every public entry point in this kit
is wrapped so that a bug inside Boosthis returns a value to your code
instead of throwing into it, and each runtime's own test suite has a case
that checks it. That is a discipline we keep and check — it is not a
guarantee that nothing can go wrong inside your process. It cannot cover a
fault that starves your process rather than throwing in it, and it says
nothing at all about speed: the figures above are what this kit costs,
measured, and they are not zero. If you find a sentence in this kit's
release notes saying Boosthis "can never slow or crash your app", that
sentence is superseded by this one — the speed half was never measured and
the figures above contradict it. Boosthis is supplied as is and used at your
own risk — the LICENSE and TERMS shipped inside this kit say so, and nothing
here promises otherwise.


Coverage check before you finish: this is a SERVER kit, so it measures this service and nothing else. Most projects with a back end also have something the person actually looks at — a React Native/Expo app, or browser-served pages — and each of those has its own kit. One kit per runtime, the same project key for all of them — the remaining ones come from this same boosthis.get_integration_kit tool, and its `runtimes` list takes every runtime this project still needs in ONE further call; `runtime` on its own is the single-runtime form, for a project deliberately spanning one. The names: "flutter", "kotlin", "rn", "swift" for an app on a device, "web" for browser-served pages, and "bun", "dotnet", "edge", "elixir", "go", "java", "node", "php", "python", "ruby", "rust" for a back end. Worth a quick look around the whole repo before calling this done (package.json naming react-native or expo → the "rn" kit; naming a browser framework such as react, vue or svelte → the "web" kit; a server-rendered one such as next, nuxt or @sveltejs/kit → "web" and a back-end kit). Boosthis serves a small shell script at https://www.boosthis.com/scan to a caller presenting this project's key: it reads file names and manifest contents only, never source code, uploads nothing, walks monorepo subdirectories, names each Boosthis runtime the project spans and lists the stacks it recognises that have no kit. With only a server kit installed the developer sees no bubble anywhere (see the note above), which reads exactly like a failed install. If a runtime is genuinely out of scope here, telling the developer so up front saves the confusion.

STILL UNANSWERED: WHAT ELSE THIS PROJECT SPANS: the edge kit covers the edge runtime and no other, and nothing here establishes which other runtimes this project has — so this delivery answers one runtime out of an unknown number rather than finishing the install. One further call settles it: boosthis.which_kits reads the manifest file NAMES already visible in the project (nothing downloaded, nothing executed, no source code read) and names the kit each one implies; boosthis.get_integration_kit then takes every runtime it named in a single `runtimes` list. A host that cannot list files, or a developer who says the project is this one runtime, is served exactly the same kit either way — what is left unestablished is what the project spans, and saying that plainly is more use to the developer than an install reported as complete. What is already registered under this project key is deliberately not named in this file: every reader of this kit gets the same bytes, and the kit's own verification compares them. The kit reply's `project_span`, boosthis.connection_status and the dashboard each name it for THIS key.

COMPLETE INSTALL PATH: the archive at kit_archive_url (or every manifest file downloaded by hand) puts the files on disk. What turns them into an install is this kit's version-matched INSTALL.md, all the way through its runtime-specific dependency, startup wiring, and first real run. Files on disk alone are not an install.
PROJECT KEY: this kit's project-key option or environment setting takes the served invite_key, or, where a reply carries none, the key from the key message the developer saved when the key was made; the exact runtime-specific name and startup call are in the guide above.
CONTROL HOW MUCH DATA ARRIVES: the guide's issues-only/private-mode switch limits collection to crashes and issues, while its share-with-AI switch opts the meter/span and snapshot mirror back in. Use the exact symbols listed for this runtime above; these are separate choices, not synonyms.
FLUSH: a short-lived worker, CLI, test, or backgrounded app exits with its queue undrained unless the runtime-specific flush call named above runs first. Where this runtime has no separate flush call, its guide says so and names the lifecycle event that drains the queue instead.
DIAGNOSTICS: the runtime's diagnostics/status calls named above, plus the first ungated console line, separate not-started, not-registered, disabled and connected. An unknown state is unknown: it is not evidence of a healthy install.
TURN IT OFF OR FORGET DATA: BOOSTHIS_DISABLED silences collection without deleting stored data. The runtime's forget/remove call named above deletes this install's stored Boosthis data and credentials on a server; these are deliberately different operations. On a website or a phone app every visitor's browser, or every phone running the app, is a copy of one install, so the same call there clears that one device and stops it sending while what the install already holds stays for its owner to erase.

FILES ON DISK ARE NOT AN INSTALL — THREE THINGS STILL HAVE TO HAPPEN AFTER THE FILES ARE WRITTEN, AND THIS IS THE POINT AT WHICH AN INSTALL IS USUALLY LEFT HALF-FINISHED. A passing file check (verify_kit_install, or its plain-HTTPS twin) says exactly one thing: the bytes written to disk match the bytes we served. It says nothing about whether anything is measured. The work that remains is that the kit is wired into the app's own startup path, that reporting is switched on with the project key, and that the app has actually been run (a back-end service also needs one real request). Files written with none of that is a project that is completely dark, and from the inside it looks exactly like a correct one — which is why the closing step is never a reading of the project from the inside, a screenshot, a preview pane, or a passing file check.
THE FINISHING QUESTION IS WHETHER BOOSTHIS HAS SEEN THE APP CHECK IN. One request answers it from anywhere — a restricted preview, a machine with no browser, a project that has never been published, a session whose tool replies are being screened: GET https://www.boosthis.com/api/connection-status, authenticated with the same project key.
Ordinary HTTPS is the route this guide uses; boosthis.connection_status is the same answer by a more convenient path, from the same builder. The state can change after the app runs, so the answer is only current as of when it was asked.
THERE ARE EXACTLY TWO STATES THIS WORK CAN END IN, and they are not the same: “reporting — Boosthis has seen this app check in”, and “files written but not switched on — nothing is being measured yet”, the second of which leaves something outstanding and someone who has to do it. Written files are not an installed, verified or finished state while Boosthis has not seen a check-in.
THE PUBLISHED APP IS THE LAST STEP. A check-in from the developer's own computer or a preview says nothing about the published app: the host builds and runs that copy from its own settings, so the key goes into the host's own secret or environment settings as well, under the setting name this guide uses (for a website or a phone app, the settings its release is built with), and the app is published again. Once the published copy has run, the same connection question shows it checking in, its runsOn naming where it runs. Where the host's settings are out of reach from here, that step is the developer's, and the final message says so in one sentence, naming the host when the project shows which it is (a file such as vercel.json, netlify.toml, wrangler.toml, fly.toml or .replit).