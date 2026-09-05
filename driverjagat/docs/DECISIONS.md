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
দিয়ে পাহারা - ৬৬টা assert, verify chain-এ যোগ করা। নিয়ম ৪ আচরণ দিয়ে
পরীক্ষা হয় (`checkAmount()` সত্যি চালিয়ে), বাকিগুলো কোড পড়ে। নিয়ম ১০
পুরো `src/` হেঁটে দেখে gateway-এর নাম payments folder-এর বাইরে গেছে কিনা।
কেউ নিয়ম সরালে test লাল হবে।

**যাচাই:** verify chain সবুজ (style, security, public, config, money,
typecheck, lint, rules), e2e emulator-এ ৫০ assert (নতুন: ফাঁকা note আটকায়,
৪ অক্ষরের কম note আটকায়, অঙ্ক অজানা হলে success হয় না), prod build clean।

**D-029 · নিয়ম ৪ এর শেষ অর্ধেক - "মালিকের হাতে" বলতে হাতটা থাকতে হবে।**
নিয়ম ৪ বলে: অঙ্ক না মিললে note লিখে মালিকের হাতে ছাড়ো। note লেখা
হতো ঠিকই, কিন্তু কোনো পাতায় উঠত না - `getPendingPayments()` শুধু
`pending` + manual provider দেখে, তাই `failed` হওয়া gateway payment
মালিকের সারিতে আসত না। মানে অর্ধেক নিয়ম কোডে ছিল, অর্ধেক ছিল না।
এখন payment নথিতে `needsOwner` ঘর। আটকে যাওয়া চারটা রাস্তাতেই সেটা
বসে: (১) অঙ্ক অজানা/কম, (২) মালিকের নথি নেই, (৩) নিষিদ্ধ অ্যাকাউন্ট,
(৪) approve এর আগে টাকা এসেছে। `/admin/payments` এ লাল "দেখা দরকার"
সারি - কারণসহ। নামাতে হলে requireOwner + কী করলেন সেটা ৪ অক্ষরের বেশি
লিখতে হবে, আর `payment.attention_cleared` audit log এ যায়। পুরনো
কারণটা মোছা হয় না - নতুন কথা তার পরে জোড়া লাগে।

**D-030 · টাকা আগে, approve পরে - job আর আটকে থাকে না।**
"টাকা + approve = প্রকাশ" - দুইটা শর্ত, কিন্তু কোড দেখত শুধু টাকার দিক
থেকে (`applyPaidEffect`)। মানুষ approve এর আগে টাকা দিয়ে ফেললে note
লিখে থেমে যেত, আর পরে admin approve করলে কেউ আর ঐ note টা দেখত না -
টাকা নেওয়া হয়েছে, admin approve করেছেন, তবু job feed এ উঠত না।
এখন `publishIfAlreadyPaid(jobId)` - `approveJob` এর শেষে ডাকা হয়,
এক transaction এ (নিয়ম ৫), approvedAt + success job_fee + ban না -
তিনটাই মিললে প্রকাশ, আর নথিটা সারি থেকে নেমে যায়। এটাই payments.ts
এর একমাত্র জায়গা যেখানে `applyPaidEffect` এর বাইরে stage বদলায়,
কারণ দুটোই "টাকার ফল"।

**যাচাই:** verify chain সবুজ (৬টা script), check:money এ ১৮টা নতুন
assert (৮৪ মোট), e2e emulator এ ৬৫ assert - নতুন দুইটা ধাপ: approve
এর আগে টাকা দিলে feed এ ওঠে না কিন্তু মালিকের সারিতে ওঠে, তারপর
approve করলে সাথে সাথে প্রকাশ হয়ে সারি থেকে নামে; আর ছোট note এ
সারি থেকে নামানো আটকায়। prod build clean।

---

## 2026-09-05

**D-031 · এক গেটওয়ে, পাঁচ সাইট - DriverJagat এর ভাগ।** মালিক
TutorJagat এর `docs/PAYMENTS-MULTISITE.md` (commit 25a8338) পাঠিয়ে
বললেন হুবহু ওভাবে বানাতে। ঐ কাগজ অনুযায়ী DriverJagat এর এলাকা:
**ছাপ `DJ-`, শেষ অঙ্ক ২**।

**সবচেয়ে জরুরি কথাটা (নিয়ম ১১):** গেটওয়ে কোনো processor না - সে
বিকাশের SMS এর সাথে অপেক্ষমাণ invoice **মেলায়**, আর মেলায়
`order_id` দিয়ে **না**, মেলায় **পাঠানোর নম্বর + টাকার অঙ্ক** দিয়ে -
পুরো অ্যাকাউন্টের সব সাইট একসাথে দেখে। তাই এক ব্যক্তি এক অঙ্ক দুই
প্ল্যাটফর্মে পাঠালে দুই session এর চাবি হুবহু এক। প্রতি প্ল্যাটফর্মের
আলাদা শেষ অঙ্ক দিলেই বিপদটা চিরতরে শেষ।

দাম বদলাল: **৳১০০ → ৳১০২** (job fee), **৳৫০০ → ৳৫০২** (connection)।
১০০ আর ৫০০ এর শেষ ০ - ওটা RentJagat এর অঙ্ক ছিল। `PAYMENT_LAST_DIGIT`
আর pure `isOurAmount()` config এ; `check:multisite` প্রতিটা fee আর
প্রতিটা `paymentAmount()` **সত্যি চালিয়ে** মেপে দেখে, তাই ভবিষ্যতে
কেউ ১৫০ বসালে test লাল হবে।

**D-032 · §৪ এর তিনটা ফাঁক।**

- **৪ক (checkout ছেড়ে দিলে):** DriverJagat এ in-flight guard-ই ছিল
  না - মানে একই মানুষ একই অঙ্কের যত খুশি pending session বানাতে
  পারতেন, আর নিয়ম ১১ অনুযায়ী গেটওয়ে তখন কোনটা মেলাবে জানত না।
  `hasInFlightPayment()` যোগ হলো **বয়সসীমাসহ** (`PAYMENT_DEAD_AFTER_DAYS`
  ৩ দিন) - সীমা ছাড়া লিখলে সেটাই পরের বাগ হতো (মানুষ চিরকাল আটকে
  যেতেন)। আর ঝাড়ু গেটওয়ে **নিজে** "আসেনি" বললে ৩ দিন পর `failed`
  করে; গেটওয়ে চুপ থাকলে কিছুই না।
- **৪খ ("অপেক্ষা করুন" পাতা):** `AutoRecheck` - ৬ সেকেন্ড পরপর, ২
  মিনিট পর্যন্ত। SMS পড়তে ২০-৩০ সেকেন্ড লাগে অথচ মানুষ সাথে সাথে
  ফেরেন, তাই প্রায় সবাই প্রথমে "অপেক্ষা করুন" দেখেন - না দেখলে ভাবতেন
  টাকা মার গেছে আর **আবার পাঠাতেন**। এটাই webhook এর উপর নির্ভরতা
  প্রায় শেষ করে দেয়।
- **৪গ (ঝাড়ু আলাদা ডাকা):** `POST /api/cron/lifecycle?task=payments`।
  গেটওয়ের portal এ Webhook URL এর ঘর **একটাই**, তাই DriverJagat
  webhook পাবেই না - এই ঝাড়ুই একমাত্র ভরসা।

**D-033 · §৫ ঝাড়ু + §২ক স্বাস্থ্যের ঘর।** `runPaymentSweep()`:
pending, createdAt অনুসারে, limit 100, manual বাদ, ১৫ মিনিটের কম বাদ,
৭ দিনের বেশি বাদ, বাকিগুলোয় `settlePayment` (নতুন নিয়ম বানায় না -
সে নিজেই গেটওয়েকে জিজ্ঞেস করে আর অঙ্ক মেলায়)। Index লাগল
`payments (status ASC, createdAt ASC)` - আগের `(status, providerId,
createdAt)` এই কাজে লাগে না, providerId মাঝখানে বসে আছে।
`GET /api/payments/health` পাঁচ সাইটের একই আকৃতিতে - **শুধু পড়ে,
কিছু বদলায় না**, গেটওয়েকেও জিজ্ঞেস করে না। মিশিয়ে ফেললে একটা
স্বাস্থ্য-পরীক্ষা নিজেই টাকা বদলে দিত। `stuckOver24h` একটাই সংখ্যা
যা সব রোগ ধরে - ০ মানে সব ঠিক।

**D-034 · §৬ - পরীক্ষা যেন সত্যিকারের হয়।** "কিছু ছোঁয়নি" ধরনের
পরীক্ষা লেখা হয়নি, কারণ function কিছু না করলেও ওগুলো পাস করত।
e2e তে একটা **সত্যিকারের ২৫ ঘণ্টা পুরনো আটকে থাকা gateway payment**
বানিয়ে দেখা হয় ঝাড়ু সেটা খুঁজে পায় কিনা, আর একটা তাজা payment
রেখে দেখা হয় সে ওটা ছোঁয় না। মেয়াদের নিয়ম `shouldExpirePending()`
pure function এ - emulator এ গেটওয়ে নেই, তাই "৩ দিন পর সত্যিই মেয়াদ
শেষ" ওখানে কোনোদিন যাচাই করা যেত না।

**যাচাই:** verify chain সবুজ (৭টা script, নতুন `check:multisite` এ
৬৩ assert), e2e emulator এ ৭২ assert, prod build clean।
