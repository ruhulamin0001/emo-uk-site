# DriverJagat - Deploy Runbook

## STATUS: code ready, deploy BAKI (3 Sep 2026)

Ei runbook RentJagat er DEPLOY.md er niyom e - ja ja RentJagat e kaj koreche
(D-019 theke D-025) hubahu ta i, sudhu nam ar domain alada.

Target: Hostinger VPS **72.62.213.196** (existing Traefik + Let's Encrypt,
tutorjagat/marriagejagat/rentjagat er sathe), domain
**driver.jagatitlimited.com** (D-006). Pore driverjagat.com hole:
`src/config/site.ts` + `docker-compose.yml` + Firebase authorized domains.

Order is load-bearing. Follow top to bottom.

## 0. Repo (D-015) - PRIVATE repo te sorano

Ekhon code `ruhulamin0001/emo-uk-site` (PUBLIC) er `driverjagat/` folder e,
branch `claude/driverjagat-platform-gacmz0`. Business code er jonno RentJagat
er moto private repo:

```bash
# GitHub e PRIVATE repo banan: ruhulamin0001/driverjagat (khali, README chara)
git clone -b claude/driverjagat-platform-gacmz0 git@github.com:ruhulamin0001/emo-uk-site.git tmp-emo
cd tmp-emo
git subtree split -P driverjagat -b driverjagat-only
git push git@github.com:ruhulamin0001/driverjagat.git driverjagat-only:main
cd .. && rm -rf tmp-emo
git clone git@github.com:ruhulamin0001/driverjagat.git
```

(Othoba: Claude Code session e driverjagat repo attach kore push korte bolun.)
Tarpor emo-uk-site er oi branch/PR ta close kore dile hobe - ota main e merge
korben NA.

## 1. Firebase project

RentJagat e project quota sesh chilo (D-019) - tai purono khali project
repurpose kora hoyechilo. Ekhane o tai korte hobe, ba Google Cloud e quota
increase chaite hobe.

```bash
npx firebase login          # ruhulsedu001@gmail.com
npx firebase projects:list  # kon project khali/repurpose kora jay
npx firebase use <project-id>
```

Console clicks (5 minutes):
1. Firestore → Create database → **asia-southeast1 (Singapore)**, production mode
2. Project settings → General → Add app → Web → "DriverJagat Web" → config copy
3. Authentication → Sign-in method → **Email link** (Email/Password er toggle) + **Google** enable
4. Authentication → Settings → Authorized domains → `driver.jagatitlimited.com`
   (ba `npx tsx --env-file=.env.production scripts/add-authorized-domain.ts driver.jagatitlimited.com`)
5. Storage → Get started (Blaze plan lagbe)
6. Project settings → Service accounts → Generate new private key →
   `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (JSON ta Downloads theke MUCHE felun)
7. Google login popup e nijer domain dekhate (RentJagat D-023): GCP Console →
   APIs & Services → Credentials → OAuth client → Authorized JavaScript origins e
   `https://driver.jagatitlimited.com`, redirect URI e
   `https://driver.jagatitlimited.com/__/auth/handler`. Ar `.env` e
   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=driver.jagatitlimited.com`.

Then, FIRST LAUNCH ONLY (rules before the site exists):

```bash
npm run deploy:rules
npm run deploy:indexes
```

## 2. Production .env (on the VPS, never in git)

`/root/driverjagat/.env` (ba subfolder hole `/root/driverjagat/driverjagat/.env`):

```
NEXT_PUBLIC_FIREBASE_API_KEY=<real>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=driver.jagatitlimited.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project>.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<real>
NEXT_PUBLIC_FIREBASE_APP_ID=<real>
FIREBASE_CLIENT_EMAIL=<from service account json>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_USE_EMULATOR=false        # false. true = sobai malik, login chara.
NEXT_PUBLIC_SITE_URL=https://driver.jagatitlimited.com
NEXT_PUBLIC_ALLOW_INDEXING=true       # sudhu PRODUCTION e
AMADERPAY_API_KEY=                    # faka = manual bKash mode, kichhu bhange na
AMADERPAY_VERIFIED=false              # prothom ASOL taka dekhar por true
BEHIND_CLOUDFLARE=false               # step 6 er age true korben NA
```

Local theke credential porikkha:
`npx tsx --env-file=.env.production --conditions=react-server scripts/check-prod-creds.ts`

## 3. DNS

jagatitlimited.com jekhane ache (Namecheap / Cloudflare):
`A  driver  →  72.62.213.196` (proxy OFF prothome - Let's Encrypt cert AGE).

## 4. Ship the code (VPS)

```bash
ssh root@72.62.213.196
# read-only deploy key diye clone (RentJagat er ~/.ssh/github_deploy key
# GitHub e ei repo teo Deploy key hishebe jog korun):
GIT_SSH_COMMAND='ssh -i ~/.ssh/github_deploy' git clone git@github.com:ruhulamin0001/driverjagat.git /root/driverjagat
cd /root/driverjagat && git config core.sshCommand 'ssh -i ~/.ssh/github_deploy'
# .env boshan (step 2), tarpor:
docker compose up -d --build
docker ps --filter name=driverjagat
curl -I https://driver.jagatitlimited.com/robots.txt   # 200
```

Never stand up a second Traefik. The compose file has no ports and no
networks on purpose - the existing Traefik finds it by labels.

Updates er por theke: `git push` → `ssh root@72.62.213.196 'bash /root/driverjagat/scripts/vps-deploy.sh'`

## 5. First owner

```bash
# Nije ekbar Google diye https://driver.jagatitlimited.com/signin e login korun, TARPOR local e:
npx tsx --env-file=.env.production --conditions=react-server scripts/make-owner.ts ruhulsedu001@gmail.com
# Logout + login abar - claim cookie te login er muhurte bose
```

## 6. Smoke test (production, 5 minutes)

- `/` opens, logo shows, no console errors
- `/signin` → Google login works (popup e nijer domain)
- `/post-job` → submit → tracking code (DJ-...)
- `/admin` as owner → job dekha jay → approve → dashboard e "ফি দিন"
- Manual bKash path → admin payments e "টাকা পেয়েছি" → job feed e uthe
- `/jobs` card e beton, gari, license dekha jay; card e thikana/nam/phone/gari r number NAI
- Card e guest lead joma (license + obhiggota soho) → `/admin/leads` e ashe
- `/track` → code + phone e obostha dekha jay
- `curl -I .../robots.txt` → 200 (Docker healthcheck depends on it)

## 7. Cloudflare LAST

1. VPS `.env`: `BEHIND_CLOUDFLARE=true`
2. `docker compose up -d --build` (rebuild - env is baked)
3. THEN Cloudflare dashboard: DNS → orange cloud ON for `driver`
4. SSL mode: **Full** (not "Full (strict)")

Wrong order = rate limiting broken in the gap.

## 8. Updates (after first launch)

Code before rules on updates - a new rule that old code doesn't satisfy locks
real users out mid-form (TutorJagat storage incident).

```bash
git push
ssh root@72.62.213.196 'bash /root/driverjagat/scripts/vps-deploy.sh'
npm run deploy:rules     # rules/index bodlale, site confirm korar PORE
npm run deploy:indexes
```

## 9. Payment go-live gate (§৯ of PAYMENTS-MULTISITE)

One gateway account runs five sites, so the order below is not optional.

- [ ] **Own API key** - DriverJagat's own, never another site's
- [ ] **SAME device key / phone / app** as the other sites. Do NOT add a second
      phone, and do NOT clone the SMS app: a clone runs in a separate Android
      profile, SMS never reaches it, and it will show as running forever while
      catching nothing. Worst kind of failure
- [ ] **Last digit 2** - every DriverJagat price ends in 2 (৳102, ৳502).
      `npm run check:multisite` proves it; never set a price ending in anything else
- [ ] `CRON_SECRET` in `.env` (`openssl rand -hex 32`)
- [ ] TWO crontab entries. The payment sweep runs every 15 minutes because the
      gateway has ONE webhook URL slot, so DriverJagat may never receive a
      webhook and this sweep is its only recovery path. The full daily run also
      expires jobs and cancels unpaid approvals - it must NOT run every 15
      minutes, since once it sends reminders that would mean ten SMS a day and
      people blocking the number:

      ```
      */15 * * * * curl -sS -X POST -H "x-cron-key: <CRON_SECRET>" \
        https://driver.jagatitlimited.com/api/cron/lifecycle?task=payments
      0 3 * * *    curl -sS -X POST -H "x-cron-key: <CRON_SECRET>" \
        https://driver.jagatitlimited.com/api/cron/lifecycle
      ```

      Without the daily one, `validUntil` is written and never read: filled
      posts stay on the feed forever, which is the one thing that would make us
      no better than the Facebook groups.

- [ ] `GET /api/payments/health` answers with the cron key (same shape on all
      five sites). Watch `stuckOver24h` - anything but 0 means money is stuck:
      phone off, app asleep, gateway down, or no network on the SIM
- [ ] Webhook URL in the portal: `https://driver.jagatitlimited.com/api/payments/callback`
- [ ] `AMADERPAY_WEBHOOK_SECRET` left EMPTY unless the portal actually shows the
      field - a guessed secret makes every webhook 401 and silently kills
      self-confirmation. Real protection is rule 2 (we ask the gateway ourselves)
- [ ] Start with `AMADERPAY_VERIFIED=false`. Until then the manual bKash queue
      is the money path
- [ ] Send ONE real ৳102 payment and walk the whole path
- [ ] Only then `AMADERPAY_VERIFIED=true`

### If someone's money is stuck

1. Check `stuckOver24h` - 0 means it is not a payment problem
2. Check the phone: on? app shows "SMS Active"? battery Unrestricted?
3. Run the sweep by hand: `POST /api/cron/lifecycle?task=payments`
4. Still nothing - search the TrxID in the gateway portal, see if money arrived
5. Arrived but not verified - the owner settles it with `markManuallyPaid`,
   TrxID in the note

## 10. Emulator test (local, optional but recommended before launch)

```bash
npm run emulator      # alada terminal (Java lage)
npm run check:rules   # rules bite test
npm run e2e           # puro jibonchokro 82 assert
```
