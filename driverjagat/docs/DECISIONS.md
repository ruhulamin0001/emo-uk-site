# DriverJagat - সিদ্ধান্তের খাতা

> এই ফাইল ই সত্যের উৎস। PLAN.md বা পুরনো কোনো লেখার সাথে conflict হলে এটা জিতবে।
> নতুন সিদ্ধান্ত হলে নিচে append হবে - কখনো মুছে rewrite না।

---

## 2026-09-03

**D-000 · প্রজেক্ট জন্ম।** DriverJagat = TutorJagat blueprint এর চতুর্থ clone।
মালিক: "আমরা বাংলাদেশে ড্রাইভারদের আর গাড়ির মালিকদের সংযোগ করে দিচ্ছি জবপর্টাল
মিডিয়া হিসেবে, নাম Driverjagat.com, আপাতত driver.jagatitlimited.com এ deploy
হবে, Tutorjagat / Marriagejagat / Rentjagat যেভাবে করা হয়েছে সেভাবেই।"
Template = RentJagat (provider পোস্ট করে, seeker lead দেয় - দিক মেলে)। Stack,
VPS, Traefik, deploy order - সব আগেরটার মতো।

**D-001 (খোলা, default ধরা) · দিক।** গাড়ির মালিক / company "ড্রাইভার চাই" পোস্ট
দেয় (login, approve এর পর fee), ড্রাইভার feed দেখে "এই কাজে আগ্রহী" lead দেয়
(login নাই, ফ্রি)। Job portal মানেই employer পোস্ট, candidate apply - আর BD র
driver agency model এও মালিকই টাকা দেয়। মালিক confirm করলে বন্ধ হবে।

**D-002 (খোলা, default ধরা) · Pricing।** Job post fee ৳100 (approve এর পরে),
connection fee ৳500 (দুই পক্ষ রাজি হলে, মালিক দেয়), ড্রাইভার পুরো ফ্রি, freeQuota 0।
RentJagat এর সমান রাখা হলো। Agency ৳3-5 হাজার নেয় বলে ৳1000 ও চলতে পারে -
মালিকের সংখ্যা এলে `src/config/business.ts` + `scripts/check-config.ts` এক
জায়গায় বদলাবে।

**D-003 · Scope v1: 9 ধরনের গাড়ি।** private_car, suv, microbus, pickup,
covered_van, truck, bus, cng_auto, motorcycle। সব একই feed এ, vehicleType
filter দিয়ে। BRTA license rule code এ: truck/bus/covered_van এ medium/heavy
লাগবে, motorcycle এ motorcycle license (`licenseCovers()`)।

**D-004 · ড্রাইভারের profile board Phase 2 তে।** v1 = শুধু মালিকের পোস্ট +
ড্রাইভারের lead। পরে `driver_profiles` collection - মালিকরা browse করবে।

**D-005 · Job মেয়াদ 30 দিন।** RentJagat এর 60 ও না - ড্রাইভারের চাকরি ১-২
সপ্তাহে ভরে যায়। approvedUnpaidExpiryDays 7।

**D-006 (আংশিক খোলা) · Domain + branding।** আপাতত **driver.jagatitlimited.com**
(মালিকের কেনা jagatitlimited.com এর subdomain)। driverjagat.com কেনা হলে:
`src/config/site.ts` + `docker-compose.yml` + Firebase authorized domains।
Brand: DriverJagat / ড্রাইভার জগত, wordmark Driver (navy) + Jagat (কালো),
mark = steering wheel। রং navy **#0F3460** (RentJagat maroon, TutorJagat থেকে
আলাদা)। Logo `public/logo.svg` Claude র বানানো placeholder - মালিকের logo এলে
SVG বদলে `npx tsx scripts/make-icons.ts`।

**D-007 · Launch এলাকা।** Marketing ঢাকা-first, locations.ts এ সারা দেশ
(RentJagat এর data হুবহু)।

**D-008 · গাড়ির ছবি public কিন্তু ঐচ্ছিক।** minPhotos 0, maxPhotos 3।
RentJagat এ 3 টা ছবি বাধ্যতামূলক ছিল - ড্রাইভারের চাকরিতে অনেক মালিক ছবি দিতে
চাইবেন না, আর ছবি ছাড়াও পোস্ট অর্থবহ। ছবিতে নম্বর প্লেট / ফোন / ঠিকানা থাকলে
admin reject (`contact_in_photos`)।

**D-009 · PII = মালিকের নাম-ফোন + পূর্ণ ঠিকানা + গাড়ির registration নম্বর।**
Public card এ এলাকা পর্যন্ত। বাকি `jobs/{id}/private/contact` এ, browser rules
এ বন্ধ। `check:public` এ `vehicleRegNo`, `employerName` forbidden list এ।

**D-010 · Lead form 4 ঘর।** নাম, ফোন, লাইসেন্স (light/medium/heavy/motorcycle),
অভিজ্ঞতা (বছর) + ঐচ্ছিক note। RentJagat এর 3 ঘরের নিয়ম ভাঙা হলো কারণ license
আর অভিজ্ঞতা না থাকলে admin কে প্রতিটা ড্রাইভারকে ফোন করে জিজ্ঞেস করতে হতো।
Admin matching desk এ license job এর গাড়ির সাথে না মিললে লাল, অভিজ্ঞতা কম হলে
হলুদ।

**D-011 · Template baseline।** RentJagat এর code হুবহু copy (secrets/.env,
hero image, FB cover, FB-GROUP-COPY.md বাদে), তারপর rename:
listings→jobs, post-listing→post-job, landlord→employer, ListingCard→JobCard,
actions/landlord→employer, listing_photos→job_photos, landlord_docs→employer_docs,
landlord_phones→employer_phones, listing_fee→job_fee, rented_outside→hired_outside,
tenantName/Phone→driverName/Phone, tracking prefix RJ→DJ। Property fields
(rent, bedrooms, gas...) বাদ, job fields (salary, vehicleType, license...) যোগ।

**D-012 · "Owner" শব্দ-সংঘর্ষ।** RentJagat D-012 এর মতোই: `ROLE.owner` = site
এর মালিক (Ruhul)। গাড়ির মালিক = `employer`, status `employerStatus`।

**D-013 · Payment job-বাঁধা।** RentJagat D-013 এর হুবহু: payment নথিতে `jobId`,
ফল (publish + validUntil) ওই job এর গায়ে। Verified মালিকের নতুন পোস্টেও review +
fee লাগে, account আবার যাচাইয়ে নামে না।

**D-014 · Call outcome ড্রাইভার ভাষায়।** budget_mismatch→salary_mismatch,
visited_not_liked→trial_not_liked। Reject reason এ `salary_unrealistic` যোগ
(50 হাজারের লোভ দেখিয়ে ড্রাইভার ধরা scam), `address_in_photos`→`contact_in_photos`।

**D-015 · Repo placement (সাময়িক)।** Session এর নিয়মে code emo-uk-site (PUBLIC)
repo র `driverjagat/` subfolder এ, branch `claude/driverjagat-platform-gacmz0`।
RentJagat D-025 এর নিয়ম: business code PRIVATE repo তে। মালিক
`ruhulamin0001/driverjagat` private repo বানালে এই folder root এ যাবে, তারপর
VPS deploy key দিয়ে pull। emo-uk-site এর main এ merge করা উচিত না - ওটা
earningmoneyonline.co.uk এর static site, Hostinger auto-deploy করে।

**D-016 · Build + verify (3 Sep 2026)।** Clone + rename + adapt এক বসায়।
verify chain: check:style, check:security, check:public (18 test), check:config
(60+ test), typecheck, lint, prod build - সব সবুজ। check:rules আর e2e emulator
লাগে - এই session এ চালানোর চেষ্টা DEPLOY.md এ লেখা। Firebase project, VPS
.env, DNS - মালিকের হাতে (DEPLOY.md)।

---

## 2026-09-04

**D-026 · Payment system TutorJagat-এর ১০ নিয়মে যাচাই ও ঠিক করা।** মালিক
১০টা নিয়ম হুবহু লিখে দিয়েছেন। RentJagat থেকে আসা code-এ ৭টা নিয়ম আগে
থেকেই ঠিক ছিল, ৩টা ভাঙা ছিল:

**নিয়ম ৪ ভাঙা ছিল (সবচেয়ে বিপজ্জনক)।** লেখা ছিল
`result.amount > 0 && result.amount < doc.amount`। মানে provider `amount: 0`
বা কিছুই না পাঠালে শর্তটা মিথ্যা হতো, আর payment টা **চুপচাপ pass করে
যেত** - অঙ্ক একবারও মেলানো হতো না। Gateway-এর উত্তরের গঠন বদলালে
(`amount` এর জায়গায় `total`) প্রতিটা payment যাচাই ছাড়া publish হয়ে যেত।
এখন: অঙ্ক অজানা/০/negative → hard fail, note লিখে মালিকের হাতে।

**নিয়ম ৯ আংশিক ভাঙা ছিল।** requireOwner ঠিক ছিল, কিন্তু note-এর ৪ অক্ষরের
নিয়ম ছিল না (`"ok"` চলত), আর activity log-এ কিছুই লেখা হতো না - অথচ এই
একটা রাস্তায় gateway-এর কোনো প্রমাণ নেই, শুধু একজন মানুষের কথা। এখন
`MANUAL_PAYMENT.noteMinChars: 4` (config/business.ts), action আর server
**দুই জায়গায়** মাপা হয় (action URL সরাসরি POST করা যায়), আর
`payment.manual_settle` audit log-এ TrxID সহ লেখা হয়।

**নিয়ম ১০ ভাঙা ছিল।** callback route সরাসরি
`@/lib/payments/amaderpay` import করত, আর comment-এ gateway-এর নাম ছিল।
Gateway বদলালে ওই file-ও বদলাতে হতো। এখন `PaymentProvider` চুক্তিতে
`verifySignature?()` যোগ হয়েছে, `index.ts` neutral
`verifyWebhookSignature()` দেয়, callback route শুধু `@/lib/payments`
চেনে। এখন gateway বদলাতে **শুধু** `index.ts`-এর একটা import + gateway
file বদলাবে।

**D-027 · `checkAmount()` আলাদা pure function।** নিয়ম ৪ settlePayment-এর
ভেতরে লুকানো থাকলে পরীক্ষা করতে emulator + payment doc + নকল gateway
লাগত - আর সেই কারণেই নিয়মটা এতদিন না-পরীক্ষিত অবস্থায় ভাঙা ছিল। এখন
Firestore ছাড়াই আচরণ দিয়ে পরীক্ষা হয়।

**D-028 · `npm run check:money` (TutorJagat-এর মতো)।** ১০টা নিয়ম script
দিয়ে পাহারা - ৫৬টা assert, verify chain-এ যোগ করা। নিয়ম ৪ আচরণ দিয়ে
পরীক্ষা হয় (`checkAmount()` সত্যি চালিয়ে), বাকিগুলো কোড পড়ে। নিয়ম ১০
পুরো `src/` হেঁটে দেখে gateway-এর নাম payments folder-এর বাইরে গেছে কিনা।
কেউ নিয়ম সরালে test লাল হবে।

**যাচাই:** verify chain সবুজ (style, security, public, config, money,
typecheck, lint, rules), e2e emulator-এ ৫০ assert (নতুন: ফাঁকা note আটকায়,
৪ অক্ষরের কম note আটকায়, অঙ্ক অজানা হলে success হয় না), prod build clean।
