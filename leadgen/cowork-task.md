# Scheduling the weekly lead run in Claude Cowork

The pipeline needs to reach Google, OpenStreetMap and the garages' own
websites. Run it from a session with normal network access — your desktop
Cowork app, or a Cowork environment whose network policy allows outbound
HTTPS. A locked-down environment will collect nothing and score everything at
zero, which looks like a bug but is just a blocked egress proxy.

## One-time setup

1. Fill in `sender` in `leadgen/config.json` — business name, phone, email,
   website, postal address, calendar link. PECR requires you to identify
   yourself, and the templates read these fields.
2. Get a Google Places API key (enable **Places API (New)**, restrict the key
   to it) and make it available to the session:
   ```bash
   export GOOGLE_PLACES_API_KEY="…"
   ```
   Without it the run still works from the seed list and OpenStreetMap — you
   just lose ratings, opening hours and the review signals.
3. Run it once by hand and read `leadgen/data/briefing.md` before you schedule
   anything. If the copy does not sound like you, edit `lib/outreach.mjs` now
   rather than after 200 emails have gone out.

## The scheduled task

Create a recurring Cowork task — **Monday 07:00**, weekly — with this prompt:

> Run the Hertfordshire lead pipeline in this repo.
>
> 1. `node leadgen/run.mjs all --source=all`
> 2. `node leadgen/test.mjs` — if any check fails, stop and tell me what broke
>    instead of sending me a list.
> 3. Read `leadgen/data/briefing.md` and reply with, in this order:
>    - how many **new** businesses appeared this week (`isNew: true`) and their
>      names, towns and scores
>    - any existing lead whose score moved by 10 points or more, and why it moved
>    - the ten highest-scoring leads I have not contacted yet
>      (`contactStatus: "new"`), each with its phone number, the single
>      strongest reason it scored, and whether it is cleared for email or
>      phone-only under PECR
>    - anything that needs me: leads with no phone and no email, and any lead
>      whose website stopped responding since last week
> 4. Do not send anything to anyone. This task researches and reports; I decide
>    who gets contacted.
>
> Keep the reply under 400 words. I want to open it with a coffee and know who
> to ring first.

## Why weekly, not daily

The garage trade does not turn over fast enough to justify a daily API bill.
A week is long enough for a new workshop to appear on Google, for a fresh
review to land, and for you to actually work through the previous list. Daily
runs mostly re-confirm what you already knew and cost real money doing it.

## Keeping your call notes

The dashboard saves statuses and notes in your browser. Once a week, click
**Export my statuses** and merge them back so the next run does not report
leads you have already called:

```bash
node leadgen/run.mjs import-status --file=~/Downloads/lead-statuses.json
```

Worth adding as a second step in the scheduled prompt once you are in the
habit of exporting.

## A sensible first month

- **Week 1** — work the tier A list by phone only. Twenty calls will teach you
  more about the objections than any amount of tuning. Note what they actually
  say in the dashboard.
- **Week 2** — feed the real objections back into `lib/outreach.mjs`, then
  start the email sequence to the Ltd companies.
- **Week 3 onwards** — let the weekly run surface new openings and let the
  score do the triage.

Adjust the scoring weights in `lib/score.mjs` as you learn what actually
converts. The reasons attached to each point are there so you can tell which
signal was doing the work.
