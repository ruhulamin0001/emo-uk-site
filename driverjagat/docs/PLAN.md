# DriverJagat - কার্যক্রম পরিকল্পনা ও Web App Structure

> তৈরি: 2026-09-03 · উৎস: TutorJagat blueprint + RentJagat (সবচেয়ে fresh clone)
> নিয়ম: docs/DECISIONS.md যেখানে এই ফাইলের সাথে conflict করবে, DECISIONS.md জিতবে।

---

## 1 · DriverJagat কী

**DriverJagat (ড্রাইভার জগত)** = বাংলাদেশের ড্রাইভার আর গাড়ির মালিকদের সংযোগের
admin-moderated job portal media।

- TutorJagat: গার্ডিয়ান পোস্ট দেয়, টিউটর apply করে, service = টিউশন
- MarriageJagat: দুই পরিবার, service = বিয়ের প্রস্তাব
- RentJagat: বাড়িওয়ালা পোস্ট দেয়, ভাড়াটিয়া lead দেয়, service = বাসা ভাড়া
- **DriverJagat: গাড়ির মালিক পোস্ট দেয়, ড্রাইভার lead দেয়, service = ড্রাইভারের চাকরি**

Structure হুবহু এক (three-tier, admin-vetted, pay-after-approval), শুধু service
product আলাদা। Code base = RentJagat এর হুবহু copy, rename করে।

### Wedge (কেন মানুষ আসবে)
বাংলাদেশে ড্রাইভার খোঁজা মানে ফেসবুক গ্রুপে অচেনা নম্বর, অথবা ড্রাইভার agency কে
৩-৫ হাজার টাকা। দুটোতেই ভুয়া লাইসেন্স, অভিজ্ঞতা বাড়িয়ে বলা, আর গাড়ি নিয়ে
পালানোর ভয়। DriverJagat এ:
1. **প্রতিটা পোস্ট admin verify করে তারপর publish** - ভুয়া "ড্রাইভার চাই" নেই
2. **প্রতিটা আগ্রহী ড্রাইভারের লাইসেন্স আর অভিজ্ঞতা admin ফোনে মিলিয়ে নেয়** তারপর
   মালিককে জানায়
3. **মালিকের ঠিকানা আর নম্বর ড্রাইভারের কাছে যায় না** যতক্ষণ না দুই পক্ষ রাজি, আর
   উল্টোটাও
4. agency র ৩-৫ হাজারের জায়গায় যোগাযোগ ফি ৳500 (D-002)

---

## 2 · Three-tier ম্যাপিং

| Blueprint role | RentJagat | **DriverJagat** |
|---|---|---|
| Admin | staff | staff (approve, verify, match, টাকা) |
| Service provider (পয়সা দেয়, listing পোস্ট করে) | বাড়িওয়ালা (landlord) | **গাড়ির মালিক / company (employer)** |
| Service seeker (ফ্রি, login নাই) | ভাড়াটিয়া (tenant) | **ড্রাইভার** |
| Listing | property listing | **job post ("ড্রাইভার চাই")** |
| Contact flow | "এই বাসায় আগ্রহী" lead | **"এই কাজে আগ্রহী" lead (নাম, নম্বর, লাইসেন্স, অভিজ্ঞতা)** |

দিক RentJagat এর সাথে হুবহু মেলে (provider পোস্ট করে, seeker lead দেয়), তাই RentJagat
ই সঠিক template। TutorJagat এর direction উল্টো (seeker পোস্ট করে)।

Phase 2 (D-004): ড্রাইভারের নিজের profile board ("কাজ খুঁজছি") - মালিকরা browse করে
lead দেবে। RentJagat এর rent_requests এর মতো।

---

## 3 · Sacred invariants - DriverJagat ভাষায়

1. **কোনো পোস্ট auto-publish হয় না।** `stage: pending` দিয়ে তৈরি হয়, admin approve +
   fee এলে তবেই feed এ। Stage বদলানোর code path একটাই।
2. **মালিকের ফোন নম্বর কখনো leak হয় না।** ড্রাইভার "আগ্রহী" চাপলে lead হয়, admin দুই
   পক্ষকে ফোন করে। দুই পক্ষ রাজি হলে তবেই নম্বর বিনিময়।
3. **PII = মালিকের নাম-ফোন, পূর্ণ ঠিকানা, গাড়ির নম্বর (D-009)।** Public card এ শুধু
   এলাকা। বাকি সব `jobs/{id}/private/contact` এ, browser থেকে কেউ পড়তে পারে না।
   ঠিকানা জানলে ড্রাইভার সরাসরি গিয়ে যোগাযোগ ফি bypass করবে।
4. Internal সংখ্যা (কয়জন আগ্রহী) মালিককে দেখানো হয় না - জানলে বেতন কমাবে।
5. Firestore/Storage rules default-deny। Privileged write = Admin SDK + Server Action।
6. টাকা server-side verify, amount server থেকে, এক transaction এ।
7. Power = custom claims, `staff` collection শুধু display cache। Ban = claim + revokeRefreshTokens।
8. Deploy order: code, rules, env, Cloudflare। Traefik একটাই (existing)।

**RentJagat থেকে পার্থক্য:** গাড়ির ছবি public কিন্তু **ঐচ্ছিক** (min 0, max 3) - ড্রাইভারের
চাকরিতে ছবি ছাড়াও পোস্ট চলে। ছবিতে নম্বর প্লেট / ফোন নম্বর থাকলে admin reject
(`contact_in_photos`)।

---

## 4 · Data model (Firestore)

| Collection | কে পড়ে | Notes |
|---|---|---|
| `jobs/{id}` | published হলে public, নাহলে staff | job এর public card। `write: if false` |
| `jobs/{id}/private/contact` | কেউ না (browser থেকে) | মালিকের নাম-ফোন, পূর্ণ ঠিকানা, গাড়ির নম্বর |
| `jobs/{id}/private/match` | কেউ না | দুই পক্ষ রাজি হলে ড্রাইভারের নাম-নম্বর |
| `users/{uid}` | self/staff | মালিকের profile + `employerStatus` |
| `contact_leads/{id}` | staff only | আগ্রহী ড্রাইভার (নাম, ফোন, `licenseType`, `experienceYears`, note) |
| `employer_phones/{phone}` | কেউ না | এক নম্বর = এক মালিক, ban-evader ধরা |
| `payments/{id}` | self/owner | job fee + connection fee, `jobId` সহ |
| `staff`, `rate_limits`, `activity_logs`, `settings`, `counters` | RentJagat এর হুবহু | |
| `driver_profiles/{id}` | Phase 2 | ড্রাইভারের "কাজ খুঁজছি" (পরে) |

### Job এর public fields (enums.ts)
- **jobType:** full_time / part_time / contract / temporary
- **vehicleType:** private_car / suv / microbus / pickup / covered_van / truck / bus / cng_auto / motorcycle
- **employerType:** family / company / rent_a_car / ride_share
- **salary** (মাসিক, ৳3,000 - ৳1,50,000) + `salaryNegotiable`
- **benefits[]:** food / accommodation / overtime / bonus / mobile_bill / weekly_off / medical
- **dutyHours:** h8 / h10 / h12 / flexible
- **residence:** live_in / live_out / either
- **licenseRequired:** light / medium / heavy / motorcycle (BRTA) + **experienceYearsMin**
- **startFrom:** কোন মাস থেকে
- location: division, district, area (required) - RentJagat এর locations.ts reuse
- description, photoPaths (0-3)

Validation refine: truck/bus/covered_van এ light license চলে না; motorcycle এ
motorcycle license ই লাগে (`licenseCovers()`)।

### Lead (ড্রাইভার) fields
name, phone, **licenseType**, **experienceYears**, note (ঐচ্ছিক)। Admin matching desk এ
license job এর গাড়ির সাথে মেলে কিনা আর অভিজ্ঞতা যথেষ্ট কিনা রঙ দিয়ে দেখায়।

### Stage machine (RentJagat এর হুবহু গঠন)
```
pending → published → shortlisted → onboarding → completed
```
- `shortlisted`: আগ্রহী ড্রাইভার বাছাই চলছে, admin দুই পক্ষে কথা বলছে
- `onboarding`: ইন্টারভিউ / ট্রায়াল চলছে, admin নম্বর দিয়েছে
- `completed`: নিয়োগ হয়ে গেছে
- Closed: rejected / needs_edit / expired / cancelled / `hired_outside`

### Employer status (LANDLORD_STATUS এর হুবহু)
none, draft, under_review, needs_info, **approved_unpaid**, verified, rejected, expired, banned

### Tracking code
`DJ-<month><division>-NNNNN` - public card এ দেখানো হয়, ঢোকার নিয়ম code + phone।

---

## 5 · টাকা (D-002, PLACEHOLDER - মালিক confirm করবেন)

| Fee | কে দেয় | কখন | প্রস্তাবিত |
|---|---|---|---|
| Job post fee | মালিক | admin approve এর **পরে** | ৳100 |
| Connection fee | মালিক (নিয়োগ হলে) | দুই পক্ষ রাজি, নম্বর বিনিময়ের সময় | ৳500 |
| Renewal | মালিক | 30 দিন মেয়াদ শেষে | post fee র সমান |

- ড্রাইভারের জন্য **সব ফ্রি** - supply side এ কোনো friction না
- `validDays: 30` (D-005) - ড্রাইভারের চাকরি ১-২ সপ্তাহে ভরে যায়
- Payment path: manual bKash (AMADERPAY_VERIFIED=false) - RentJagat এর হুবহু

---

## 6 · Web app structure (হুবহু RentJagat, নাম বদলে)

```
src/
├── app/
│   ├── page.tsx                     # Home
│   ├── jobs/page.tsx                # Browse (ছিল listings/)
│   ├── jobs/[code]/page.tsx         # Detail + LeadForm ("এই কাজে আগ্রহী")
│   ├── post-job/                    # মালিকের ফর্ম (ছিল post-listing/)
│   ├── dashboard/                   # মালিকের নিজের পোস্ট + status + ফি
│   ├── track/                       # DJ-code + phone দিয়ে অবস্থা দেখা
│   ├── signin/ , signin/verify/     # হুবহু copy (email-link + Google)
│   ├── payment/manual/[id]/ , payment/done/
│   ├── admin/
│   │   ├── layout.tsx (guard)  ├── page.tsx (queue)
│   │   ├── jobs/  ├── leads/  ├── payments/  ├── moderation/  └── staff/
│   ├── api/auth/session , api/auth/signout , api/payments/callback
│   └── actions/ (public.ts, employer.ts, admin.ts)
├── config/   site.ts · business.ts
├── types/    enums.ts
├── data/     locations.ts            # RentJagat থেকে copy
├── lib/      firebase/ · server/ · payments/ · validators/
│             tracking-code.ts · tracking-messages.ts · upload.ts ...
└── middleware.ts
```

Stack: Next.js 15 App Router · React 19 · TypeScript strict · Tailwind v4 · Zod 4 ·
Firebase (Auth/Firestore/Storage) · `output: 'standalone'` · Docker → Hostinger VPS
এর existing Traefik এর পেছনে + Cloudflare। নতুন Firebase project লাগবে (DEPLOY.md)।

---

## 7 · Build phases

| Phase | কাজ | Exit test |
|---|---|---|
| 0-6 | Scaffold থেকে hardening - RentJagat থেকে copy + rename + domain adapt | verify chain সবুজ, prod build clean |
| 7 | Deploy: Firebase project, VPS, DNS, first owner | মালিক runbook চালাবেন (DEPLOY.md) |
| 8 | Phase 2: driver profile board | মালিকের সিদ্ধান্ত (D-004) |

---

## 8 · মালিকের সিদ্ধান্ত লাগবে

| # | প্রশ্ন | Default (code এ এখন এটাই) |
|---|---|---|
| D-001 | মালিক পোস্ট দেয়, ড্রাইভার lead দেয় - এই দিক ঠিক? | হ্যাঁ ধরে বানানো |
| D-002 | Pricing: post ৳100 + connection ৳500, ড্রাইভার ফ্রি? | হ্যাঁ। agency ৳3-5k নেয়, ৳1000 ও যুক্তিসঙ্গত |
| D-003 | Scope v1: সব ধরনের গাড়ি (car থেকে truck)? | হ্যাঁ, 9 ধরন |
| D-004 | ড্রাইভারের profile board - v1 না Phase 2? | Phase 2 |
| D-005 | Job মেয়াদ 30 দিন? | হ্যাঁ |
| D-006 | Domain: driver.jagatitlimited.com, পরে driverjagat.com | subdomain এ শুরু |
| D-007 | Launch এলাকা | ঢাকা-first, locations সারা দেশ |
| D-008 | গাড়ির ছবি ঐচ্ছিক (0-3)? | হ্যাঁ |
| D-010 | Lead form 4 ঘর (license + অভিজ্ঞতা সহ), RentJagat এর 3 না? | হ্যাঁ - admin এর call বাঁচে |
