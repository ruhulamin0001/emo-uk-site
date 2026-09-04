#!/usr/bin/env node
/**
 * Self-test: no network needed. Runs representative garage websites through
 * the analyser, the scorer and the message builder, and asserts the pipeline
 * reaches the conclusions the campaign depends on.
 *
 *   node leadgen/test.mjs
 */
import assert from 'node:assert/strict';
import { analyseHtml } from './lib/enrich.mjs';
import { scoreLead } from './lib/score.mjs';
import { buildOutreach } from './lib/outreach.mjs';
import { normalise } from './lib/normalise.mjs';
import { readJSON, normalisePhone, extractPostcode, extractEmails } from './lib/util.mjs';

const config = readJSON('leadgen/config.json');
let passed = 0;
const check = (name, fn) => {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err.message}`);
    process.exitCode = 1;
  }
};

/* ---------- fixtures ---------- */

const PHONE_ONLY_GARAGE = `<!doctype html><html><head><title>Bloggs Motors</title></head>
<body><h1>Bloggs Motors, Watford</h1>
<p>MOT, servicing and repairs. To book an MOT, please call 01923 555123.</p>
<p>Email us: info@bloggsmotors.co.uk</p>
<p>Unit 4, Bushey Mill Lane, Watford, WD24 7RE</p>
<footer>&copy; 2019 Bloggs Motors</footer></body></html>`;

const MODERN_GARAGE = `<!doctype html><html><head><meta name="viewport" content="width=device-width">
<script src="https://www.bookmygarage.com/widget.js"></script></head>
<body><h1>Sharp Autos Ltd</h1><a href="#book">Book your MOT online</a>
<form><input type="date" name="slot"><input type="email" name="email"></form>
<script src="https://embed.tawk.to/x/default"></script>
<p>Call 01727 900900 or WhatsApp us https://wa.me/447700900900</p></body></html>`;

const MOBILE_MECHANIC = `<!doctype html><html><head><meta name="viewport" content="width=device-width"></head>
<body><h1>Two Wheel Mobile</h1><p>Mobile motorcycle servicing across Hertfordshire.</p>
<p>Ring us to book: 07700 900222</p><form><textarea name="msg"></textarea><input type="email"></form>
<footer>&copy; 2026</footer></body></html>`;

/* ---------- analyser ---------- */

console.log('\nanalyseHtml');
const phoneOnly = analyseHtml(PHONE_ONLY_GARAGE);
const modern = analyseHtml(MODERN_GARAGE);
const mobile = analyseHtml(MOBILE_MECHANIC);

check('phone-only site: no online booking detected', () => assert.equal(phoneOnly.hasOnlineBooking, false));
check('phone-only site: "call to book" wording detected', () => assert.equal(phoneOnly.callToBookOnly, true));
check('phone-only site: no contact form detected', () => assert.equal(phoneOnly.hasContactForm, false));
check('phone-only site: stale copyright year read', () => assert.equal(phoneOnly.copyrightYear, 2019));
check('phone-only site: missing viewport meta detected', () => assert.equal(phoneOnly.hasViewportMeta, false));

check('modern site: booking platform identified', () => assert.equal(modern.bookingPlatform, 'BookMyGarage'));
check('modern site: online booking detected', () => assert.equal(modern.hasOnlineBooking, true));
check('modern site: chat widget identified', () => assert.equal(modern.chatWidget, 'Tawk.to'));
check('modern site: WhatsApp number pulled out', () => assert.equal(modern.whatsapp, '447700900900'));

check('mobile mechanic: flagged as mobile', () => assert.equal(mobile.mentionsMobileMechanic, true));
check('mobile mechanic: contact form detected', () => assert.equal(mobile.hasContactForm, true));

/* ---------- extraction ---------- */

console.log('\nextraction');
check('UK landline normalised to E.164', () => assert.equal(normalisePhone('01923 555123').e164, '+441923555123'));
check('UK mobile classified as mobile', () => assert.equal(normalisePhone('07700 900222').type, 'mobile'));
check('premium-rate numbers rejected downstream', () => assert.equal(normalisePhone('0909 8790000').type, 'premium'));
check('postcode pulled from an address line', () => assert.equal(extractPostcode('Unit 4, Bushey Mill Lane, Watford, WD24 7RE'), 'WD24 7RE'));
check('email extracted, asset filenames ignored', () => assert.deepEqual(extractEmails('info@bloggsmotors.co.uk logo@2x.png'), ['info@bloggsmotors.co.uk']));

/* ---------- normalise ---------- */

console.log('\nnormalise');
const { leads: normalised, stats } = normalise(
  [
    { source: 'a', name: 'Halfords Autocentre Watford', category: 'car_repair', address: 'Watford WD24 4AS' },
    { source: 'a', name: 'Bloggs Motors', category: 'car_repair', phone: '01923 555123', address: 'Watford, WD24 7RE' },
    { source: 'b', name: 'Bloggs Motors Watford', category: 'car_repair', phone: '01923 555123', website: 'https://bloggsmotors.co.uk', rating: 4.6, reviewCount: 88 },
    { source: 'a', name: 'Closed Garage', category: 'car_repair', businessStatus: 'CLOSED_PERMANENTLY', address: 'Watford WD24 7RE' },
    { source: 'a', name: 'Camden Motors', category: 'car_repair', address: 'London NW1 8AB' },
  ],
  config
);
check('chain filtered out', () => assert.equal(stats.chains, 1));
check('permanently closed filtered out', () => assert.equal(stats.closed, 1));
check('out-of-county postcode filtered out', () => assert.equal(stats.outOfArea, 1));
check('duplicate merged on shared phone number', () => assert.equal(stats.merged, 1));
check('two unique leads survive', () => assert.equal(normalised.length, 1 + 0));
check('merged record kept the richer website field', () => assert.ok(normalised[0].website));

/* ---------- scoring ---------- */

console.log('\nscoreLead');
const hotLead = {
  id: 'test1', name: 'Bloggs Motors', category: 'car_repair', town: 'Watford', postcode: 'WD24 7RE',
  phoneE164: '+441923555123', phoneNational: '01923555123', email: 'info@bloggsmotors.co.uk',
  website: 'https://bloggsmotors.co.uk', rating: 4.6, reviewCount: 88,
  openingHours: ['Monday: 8:00 AM – 5:00 PM', 'Saturday: Closed', 'Sunday: Closed'],
  enrichment: { analysis: phoneOnly },
  reviewSignals: { sampled: 5, missedCallMentions: 2, quotes: ['Rang three times, no answer, gave up and went elsewhere.'] },
};
const coldLead = {
  id: 'test2', name: 'Sharp Autos Ltd', category: 'car_repair', town: 'St Albans',
  phoneE164: '+441727900900', email: 'hi@sharpautos.co.uk', website: 'https://sharpautos.co.uk',
  rating: 4.7, reviewCount: 210, enrichment: { analysis: modern },
};
const mobileLead = {
  id: 'test3', name: 'Two Wheel Mobile', category: 'motorcycle_repair', town: 'Watford',
  phoneE164: '+447700900222', website: 'https://twowheelmobile.co.uk',
  enrichment: { analysis: mobile },
};

const hot = scoreLead(hotLead, config);
const cold = scoreLead(coldLead, config);
const mob = scoreLead(mobileLead, config);

check('phone-only busy garage lands in tier A', () => assert.equal(hot.tier, 'A'));
check('garage that already books online scores far lower', () => assert.ok(cold.score < hot.score - 30, `hot=${hot.score} cold=${cold.score}`));
check('existing booking platform is a stated negative', () => assert.ok(cold.reasons.some((r) => r.points < 0 && /books online/i.test(r.reason))));
check('missed-call reviews recorded as a gap', () => assert.ok(hot.gaps.includes('reviews-missed-calls')));
check('weekend closure recorded as a gap', () => assert.ok(hot.gaps.includes('closed-weekend')));
check('mobile mechanic recorded as a gap', () => assert.ok(mob.gaps.includes('mobile-mechanic')));
check('every scoring reason carries readable text', () => assert.ok(hot.reasons.every((r) => typeof r.reason === 'string' && r.reason.length > 10)));

check('unreachable site is not scored as "no online booking"', () => {
  const dead = {
    id: 'test9', name: 'Dead Site Motors', category: 'car_repair', town: 'Ware',
    website: 'https://deadsitemotors.co.uk', phoneE164: '+441920555000',
    enrichment: { analysis: null, enrichError: 'unreachable', websiteReachable: false },
  };
  const r = scoreLead(dead, config);
  assert.ok(!r.gaps.includes('no-online-booking'), 'must not infer a booking gap from a site it never opened');
  assert.ok(r.gaps.includes('site-down'));
});

/* ---------- outreach + compliance ---------- */

console.log('\nbuildOutreach');
Object.assign(hotLead, hot);
Object.assign(coldLead, cold);
const soleTrader = { ...hotLead, id: 'test4', name: 'Dave the Mechanic', email: 'dave@davemech.co.uk', ...scoreLead({ ...hotLead, name: 'Dave the Mechanic' }, config) };
const corporate = { ...hotLead, id: 'test5', name: 'Bloggs Motors Ltd', ...scoreLead({ ...hotLead, name: 'Bloggs Motors Ltd' }, config) };

buildOutreach([hotLead, coldLead, soleTrader, corporate], config);

check('strongest gap chosen as the hook', () => assert.equal(hotLead.outreach.hookGap, 'reviews-missed-calls'));
check('email body names the business', () => assert.ok(hotLead.outreach.email.body.includes('Bloggs Motors')));
check('email carries an opt-out line', () => assert.ok(hotLead.outreach.email.body.includes('reply STOP')));
check('email names the sender', () => assert.ok(hotLead.outreach.email.body.includes(config.sender.name)));
check('call script includes objection handling', () => assert.ok(/IF "how much"/.test(hotLead.outreach.callScript)));
check('call script warns about TPS/CTPS', () => assert.ok(/TPS\/CTPS/.test(hotLead.outreach.callScript)));
check('two follow-ups scheduled', () => assert.equal(hotLead.outreach.followUps.length, 2));
check('sole trader is NOT cleared for cold email', () => assert.equal(soleTrader.outreach.readyToEmail, false));
check('limited company IS cleared for cold email', () => assert.equal(corporate.outreach.readyToEmail, true));
check('nothing is call-ready before a TPS check is recorded', () => assert.equal(corporate.outreach.readyToCall, false));

corporate.ctpsCheckedAt = '2026-08-22';
buildOutreach([corporate], config);
check('recording the TPS check unlocks calling', () => assert.equal(corporate.outreach.readyToCall, true));

/* ---------- sample output for eyeballing ---------- */

if (process.argv.includes('--show')) {
  console.log('\n' + '─'.repeat(70));
  console.log('SAMPLE EMAIL (tier A lead, score ' + hotLead.score + ')');
  console.log('─'.repeat(70));
  console.log('Subject: ' + hotLead.outreach.email.subject + '\n');
  console.log(hotLead.outreach.email.body);
  console.log('\n' + '─'.repeat(70));
  console.log('SAMPLE CALL SCRIPT');
  console.log('─'.repeat(70));
  console.log(hotLead.outreach.callScript);
  console.log('\n' + '─'.repeat(70));
  console.log('WHY THIS LEAD SCORED ' + hotLead.score);
  console.log('─'.repeat(70));
  for (const r of hotLead.reasons) console.log(`  ${r.points > 0 ? '+' : ''}${r.points}  ${r.reason}`);
}

console.log(`\n${passed} checks passed${process.exitCode ? ', SOME FAILED' : ''}\n`);
