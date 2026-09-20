# নম্বর কেনার সময় operator থেকে যা যা নিতে হবে (BD office এর জন্য)

Operator: Ranks ITT (09666), Amber IT (09611), Royal Green, Sarkar Communication বা তাদের reseller।
প্রথমে একটা নম্বর, test pass করলে বাকিগুলো। প্রতিটা item এর পাশে কেন লাগবে আর না নিলে কী হবে।

## A. অবশ্যই লাগবে (এগুলো ছাড়া কল চলবে না)

| # | কী নিতে হবে | কেন | না নিলে |
|---|---|---|---|
| 1 | SIP server address (host বা IP) আর port (সাধারণত 5060) | আমাদের Asterisk এখানে register করবে | trunk register হবে না, কোনো কল ঢুকবে না |
| 2 | SIP username আর password (প্রতি নম্বরে আলাদা) | registration আর call এর authentication | 401 বা 403 error, কল হবে না |
| 3 | লিখিত confirmation যে IP 72.62.213.196 (Hostinger, বাংলাদেশের বাইরে) থেকে registration নেবে, দরকার হলে ওরা IP whitelist করবে | অনেক IPTSP operator শুধু BD IP নেয় | সব ঠিক থাকলেও 403 Forbidden, এই operator বাদ, অন্যটা ধরতে হবে। এজন্য আগে ১টা নম্বর দিয়ে test |
| 4 | Codec কোনটা: G.711 ulaw বা alaw, নাকি G.729 | audio format মিলতে হবে | কল উঠবে কিন্তু কথা শোনা যাবে না বা কেটে যাবে |
| 5 | Registration type: username password দিয়ে register, নাকি IP authentication | config আলাদা | ভুল type এ register হয় না |
| 6 | Outbound caller ID হিসেবে নিজের 096 নম্বর পাঠানো যাবে কি না, P-Asserted-Identity লাগে কি না | গ্রাহকের ফোনে আমাদের নম্বর দেখাবে | outbound কল reject হবে বা ভুল নম্বর দেখাবে |
| 7 | প্রতি নম্বরে বা account এ একসাথে কয়টা কল (channel) | ব্যস্ত সময়ে দ্বিতীয় কল ঢুকবে কি না | দ্বিতীয় কলার busy পাবে |

## B. টাকা আর হিসাব (না নিলে হঠাৎ service বন্ধ বা বেশি bill)

| # | কী নিতে হবে | কেন | না নিলে |
|---|---|---|---|
| 8 | Per minute rate (incoming আর outgoing আলাদা), VAT সহ, billing pulse (১ সেকেন্ড না ৬০ সেকেন্ড) | খরচের হিসাব | মাস শেষে অবাক হওয়ার bill |
| 9 | Prepaid balance কীভাবে recharge (bKash, bank), minimum recharge, কত দিনে balance শেষ হলে নম্বর বন্ধ | service চালু রাখা | balance শেষ, নম্বর নীরব, গ্রাহক হারানো |
| 10 | Daily spend cap বা low balance SMS alert চালু করা | hack বা ভুল হলে ক্ষতি সীমিত | কেউ hack করলে এক রাতে balance শেষ |
| 11 | Reseller বা customer panel এর login: balance, recharge, CDR (call record) দেখা | নিজেরা হিসাব মেলানো | প্রতিবার operator কে ফোন করতে হবে |

## C. মালিকানা আর কাগজ (না নিলে নম্বর হারানোর ঝুঁকি)

| # | কী নিতে হবে | কেন | না নিলে |
|---|---|---|---|
| 12 | KYC কী কী লাগে (NID, trade licence, ছবি), নম্বর কার নামে register হচ্ছে | BTRC নিয়ম | KYC ছাড়া নম্বর active হয় না বা পরে block |
| 13 | Reseller থেকে নিলে: reseller বন্ধ হলে নম্বর আমাদের থাকবে কি না, operator এ সরাসরি transfer করা যাবে কি না | ৫টা ব্যবসার নম্বর তাদের brand | reseller উধাও হলে নম্বর হারাবেন, customer কে নতুন নম্বর দিতে হবে |
| 14 | চুক্তি বা invoice এর কপি, নম্বর আর দাম লেখা | প্রমাণ | ঝামেলা হলে কিছু দেখানোর থাকবে না |

## D. Support আর technical (থাকলে ভালো, না থাকলেও চলে)

| # | কী নিতে হবে | কেন | না নিলে |
|---|---|---|---|
| 15 | Operator এর SIP আর media server এর IP list | firewall এ শুধু ওদের IP allow করা | firewall একটু ঢিলা রাখতে হবে, চলবে |
| 16 | Technical support এর WhatsApp বা phone, কখন পাওয়া যায় | কল বন্ধ হলে দ্রুত ঠিক | সমস্যায় অপেক্ষা |
| 17 | SMS পাঠানোর API আছে কি না (কলারকে ঠিকানা SMS করার জন্য) | send_sms tool | AI ঠিকানা মুখে বলবে, SMS পাঠাবে না |
| 18 | Incoming DID কোন format এ পাঠায় (09666..., 88096..., +88096...) | log এ নম্বর মেলানো | আমাদের config এ লাগে না, শুধু জানার জন্য |

## প্রথম test এর নিয়ম
1. একটা নম্বর নিন, item 1 থেকে 7 হাতে নিন।
2. VPS এ `deploy/trunks.csv` তে এক লাইন বসান, `bash scripts/vps-deploy.sh`।
3. `docker compose exec asterisk asterisk -rx "pjsip show registrations"` এ Registered দেখলে item 3 pass।
4. Mobile থেকে কল দিন, AI ধরলে item 4 আর 5 pass।
5. Extension 101 থেকে mobile এ কল দিন, ফোনে 096 নম্বর দেখালে item 6 pass।
6. তারপর বাকি ৯টা নম্বর।
