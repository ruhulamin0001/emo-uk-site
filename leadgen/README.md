# Herts Lead Desk

Finds every independent car garage and motorcycle workshop in Hertfordshire,
works out which of them are losing jobs to a phone nobody can answer, and
writes the outreach for each one.

Built for one specific offer: **an AI receptionist that answers the call, books
the job into the diary and texts the customer back.** The whole pipeline is
tuned to find businesses where that is obviously worth money — and to score
down the ones where it is not.

Nothing here is part of the public website. It is a private sales workspace
that happens to live in the same repo.

---

## Quick start

No dependencies, no build step. Node 18+ (tested on Node 22).

```bash
node leadgen/run.mjs all      # collect → enrich → score → write messages → export
node leadgen/run.mjs stats    # see what you have
```

Then open the desk:

```bash
cd leadgen && python3 -m http.server 8899
# → http://127.0.0.1:8899/dashboard.html
```

Outputs land in `leadgen/data/` (git-ignored — it holds live contact details):

| File | What it is |
|---|---|
| `leads.json` | Full state. Merged across runs, so your call notes survive. |
| `leads.csv` | Flat export for a CRM or a spreadsheet. |
| `briefing.md` | This week's call list, grouped by town for route planning. |

---

## Where the leads come from

Three sources, all opt-in via `--source`:

**`seed`** (default, no setup) — 39 real Hertfordshire garages and bike
workshops shipped in `data-seed/hertfordshire-seed.json`, gathered from public
web search. Enough to start calling today. Phone numbers marked
`verified: false` were read from search results and are confirmed by the
enrich step against the business's own website before they are trusted.

**`places`** — Google Places API (New). This is the official, Terms-compliant
way to read Google Business Profile listings, and it is the source that makes
this pipeline complete rather than a sample. It brings the things that matter
most: rating, review count, opening hours, and the phone number Google holds.

```bash
export GOOGLE_PLACES_API_KEY="…"
node leadgen/run.mjs collect --source=places
```

Enable **Places API (New)** in Google Cloud and restrict the key to it. A full
county sweep is roughly 120 requests (2 categories × 31 towns × ~2 queries).
Check current Places pricing before you schedule it — weekly is ample for this
market, daily is wasted money.

> Use the API, not the map. Scraping Google Maps result pages breaks Google's
> Terms of Service and gets your IP blocked. The API returns the same data,
> costs pennies, and cannot be taken away from you.

**`overpass`** — OpenStreetMap, free and keyless. Weaker on phone numbers than
Google but good for breadth, and a useful cross-check that Places has not
missed a back-street workshop.

Run all three and they are deduplicated into one list — the same shop found
under two names with one phone number becomes one lead, keeping the richest
field from each source.

---

## How a lead is scored

The pipeline visits each business's own website and asks one question: **how
does a customer actually book a job here?**

A garage with a BookMyGarage widget has already solved this and scores down 25.
A garage whose site says "call us to book", has no contact form, closes at 5pm
and has two Google reviews complaining that nobody answers the phone is a
tier-A lead, and the script tells you exactly that when you dial.

Signals that push a lead up:

| Signal | Why it matters |
|---|---|
| No online booking | Every MOT and service has to come through the phone |
| Reviews mentioning unanswered calls | The customer has already said the quiet part out loud |
| Mobile mechanic | Physically cannot answer while working on a vehicle |
| Closed at weekends | Saturday and Sunday enquiries are simply lost |
| No contact form | A customer who will not phone has nowhere to go |
| Well rated and busy | Demand is proven; capacity to answer it is not |

Signals that push a lead down: an existing booking platform, an answering
service already mentioned on the site, a franchise or main-dealer name (the
decision is made centrally), a weak reputation, or no way to contact them yet.

Every point carries a sentence of plain English, and those sentences are what
you say on the call. Open any lead in the dashboard to see the breakdown.

Tiers: **A ≥ 65**, **B 45–64**, C below that. Adjust in `config.json`.

---

## What it writes for you

For each lead, keyed off that lead's strongest gap:

- **A cold email** — opens with the specific thing you noticed about *their*
  business, names your offer, carries your identity and a working opt-out.
- **A text / WhatsApp message** — same hook, under 320 characters.
- **A call script** — a twenty-second opener, three objection handlers
  ("we manage fine", "how much", "send me something") and a voicemail to leave
  once.
- **Two follow-ups**, at day 3 and day 10, then it stops. Nobody wants a
  seventh email.

The opener is chosen from the gaps actually found, in priority order — a
review quote beats a missing booking form, which beats weekend closing. So
the message could only have been written for that garage, which is the entire
reason it gets a reply.

---

## The rules this follows

UK marketing law is not optional and the tool enforces it rather than
reminding you about it.

**Cold email.** Under PECR, unsolicited B2B email is permitted to *corporate
subscribers* — a Ltd, PLC or LLP — provided you identify yourself and give a
working opt-out. Both are built into every template. Sole traders and ordinary
partnerships count as individuals, so the tool classifies each business by name
and **refuses to mark them email-ready**, routing you to the phone or the post
instead.

**Cold calling.** Every number must be screened against the TPS/CTPS registers
first. That is a paid service and cannot be automated here, so no lead is
marked call-ready until you record the check:

```bash
# in the dashboard: "Mark TPS/CTPS checked", then
node leadgen/run.mjs import-status --file=lead-statuses.json
node leadgen/run.mjs outreach
```

**Opt-outs.** One command, applied immediately to matching leads and honoured
on every future run:

```bash
node leadgen/run.mjs suppress --email=someone@garage.co.uk
node leadgen/run.mjs suppress --phone=+441923555123
node leadgen/run.mjs suppress --domain=garage.co.uk
```

**Data handling.** `leadgen/data/` is git-ignored, and `leadgen/.htaccess`
denies web access in case the folder ever lands inside the deployed web root.
Keep it that way — it holds live contact details and your notes about real
people's businesses.

**Politeness.** The enricher identifies itself, obeys `robots.txt`, waits 2.5
seconds between requests and reads at most four pages per site. It reads
public pages the way a person would; it does not hammer anyone.

---

## Running it every week

The point of a scheduled run is not to re-read the same 39 garages. It is to
catch what changed: a new workshop that opened, a fresh review complaining
about the phone, a garage whose website went down.

State is merged across runs — new businesses are flagged `isNew`, and your
`contactStatus`, notes and TPS checks are never overwritten by a re-run.

See [`cowork-task.md`](cowork-task.md) for the exact task to schedule.

---

## Commands

```bash
node leadgen/run.mjs all [--source=all]        # the whole pipeline
node leadgen/run.mjs collect --source=seed|places|overpass|all
node leadgen/run.mjs enrich [--limit=20] [--force]
node leadgen/run.mjs reviews [--limit=50]      # needs GOOGLE_PLACES_API_KEY
node leadgen/run.mjs score
node leadgen/run.mjs outreach
node leadgen/run.mjs export
node leadgen/run.mjs stats
node leadgen/run.mjs suppress --email=… --phone=… --domain=… --name=…
node leadgen/run.mjs import-status --file=lead-statuses.json
node leadgen/test.mjs [--show]                 # 40 offline checks, no network
```

## Files

```
leadgen/
  config.json                     towns, categories, chains to exclude, thresholds
  run.mjs                         CLI and state merging
  test.mjs                        offline self-test
  dashboard.html                  local lead desk (never served publicly)
  data-seed/hertfordshire-seed.json   39 starter leads
  data/                           generated output — git-ignored
  lib/
    sources/google-places.mjs     Places API (New) + review-signal pass
    sources/overpass.mjs          OpenStreetMap
    sources/seed.mjs              the shipped starter list
    normalise.mjs                 dedupe, chain filter, county filter
    enrich.mjs                    website reader: how do they take bookings?
    score.mjs                     0–100 with a reason for every point
    outreach.mjs                  email, SMS, call script, follow-ups
    compliance.mjs                PECR routing, suppression, TPS gate
    export.mjs                    JSON, CSV, weekly briefing
    util.mjs                      UK phone/postcode/email handling
```

## Before your first send

Fill in `config.json` → `sender`. Your name is there; your business name,
phone, email, website, postal address and calendar link are not. The email
templates need them — PECR requires you to identify yourself, and an email with
no way to reach you back does not get replies anyway.
