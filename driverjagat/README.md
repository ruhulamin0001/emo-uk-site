# DriverJagat - ড্রাইভার জগত

Live (target): https://driver.jagatitlimited.com (pore driverjagat.com)

Admin-mediated driver job media for Bangladesh. Fourth clone of the TutorJagat
blueprint (TutorJagat, MarriageJagat, RentJagat er por): three-tier (admin /
driver / gari r malik), human-vetted, default-deny, pay-to-post. Only the
service differs - driver er chakri instead of tuition, biodata, or basha.

- Gari r malik / company "ড্রাইভার চাই" post den (login lage, approve er por fee)
- Driver feed dekhen, "এই কাজে আগ্রহী" chapen (login NAI, taka NAI)
- Admin phone kore license-obhiggota milan, dui pokkho razi hole number binimoy

## Docs

- `docs/PLAN.md` - master plan (architecture, invariants, data model, build order)
- `docs/DECISIONS.md` - decision log. **Overrides PLAN.md where they disagree.**
- `docs/DEPLOY.md` - runbook (Firebase project, VPS, Cloudflare, first owner)

## Sacred invariants (short list)

1. Job never auto-publishes - one `createJob()`, `stage: pending` hard-coded
2. Phone never leaks - admin exchanges numbers only after BOTH sides agree
3. The PII here (D-009): malik er nam-phone, FULL ADDRESS, gari r registration
   number - public card shows area only; the rest lives in
   `jobs/{id}/private/contact`, closed to browsers
4. Car photos are PUBLIC but OPTIONAL (D-008) - admin rejects photos that show
   a phone number, address or number plate
5. leadCount is admin-only - the malik never learns how many drivers applied
6. Default-deny rules - privileged writes are Admin SDK + Server Action only
7. Money: the 10 rules (D-026, `npm run check:money`). Amount computed server-side,
   the callback body is a hint not proof, `verify()` asks the provider with BOTH ids,
   an unknown or short amount hard-fails, and payment + its effect land in ONE
   transaction. Payment carries a `jobId`, effect lands on THAT job (multi-job model)
8. Power = custom claim; `staff` collection is a display cache
9. Ban = claim + `revokeRefreshTokens` - the live session dies now
10. Deploy order: code before rules (first launch: rules first), env before Cloudflare

## Repo placement

Ei folder ta apatoto `ruhulamin0001/emo-uk-site` er `driverjagat/` subfolder e
(branch `claude/driverjagat-platform-gacmz0`). emo-uk-site PUBLIC repo - business
code er jonno RentJagat er moto ekta PRIVATE repo `ruhulamin0001/driverjagat`
banano uchit, tarpor ei folder ta oikhane root e boshbe. docs/DEPLOY.md e dhap.

## Local dev

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_USE_EMULATOR=true thakbe
npm run dev:emulator
```

Emulator mode e login chara i dev-admin (owner) pawa jay - SUDHU local e.
`NEXT_PUBLIC_USE_EMULATOR` production e SOB SOMOY `false`.

## Verify

```bash
npm run verify   # style + security + public + config + typecheck + lint + rules
npm run e2e      # emulator e puro jibonchokro (submit → approve → taka → lead → match)
```

## Deploy (Hostinger VPS, existing Traefik, Cloudflare)

```bash
git push
ssh root@72.62.213.196 'bash /root/driverjagat/scripts/vps-deploy.sh'
npm run deploy:rules     # code AGE, rules PORE (first launch: rules first)
```

Never stand up a second Traefik. `BEHIND_CLOUDFLARE=true` + rebuild BEFORE
turning on the orange cloud. Domain change = `src/config/site.ts` +
`docker-compose.yml` + Firebase authorized domains only.
