/**
 * Turns each lead's specific gap into a message that could only have been
 * written for them. Generic mail-merge gets deleted; "I noticed your site
 * has no online booking and you close at 5" gets a reply.
 */
import { contactPolicy, loadSuppression } from './compliance.mjs';

/* The opening line is chosen by the strongest gap we actually found. */
const HOOKS = {
  'reviews-missed-calls': (l) =>
    `a couple of your Google reviews mention people not being able to get through on the phone`,
  'mobile-mechanic': () =>
    `you work mobile, which means every call that comes in while you are on a job goes unanswered`,
  'no-website': () =>
    `you take all your bookings over the phone, with no website taking the pressure off`,
  'site-down': () =>
    `your website was not responding when I checked, so every enquiry right now is landing on your phone`,
  'no-online-booking': () =>
    `there is no way to book a slot on your website — every MOT and service has to come through the phone`,
  'call-to-book-only': () =>
    `your site asks customers to call to book, so the phone is carrying all of it`,
  'closed-weekend': () =>
    `you are closed at weekends, which is exactly when most people get round to sorting their MOT`,
  'no-contact-form': () =>
    `there is no contact form on your site, so a customer who will not phone has nowhere to go`,
};

const HOOK_ORDER = [
  'reviews-missed-calls',
  'mobile-mechanic',
  'no-website',
  'site-down',
  'no-online-booking',
  'call-to-book-only',
  'closed-weekend',
  'no-contact-form',
];

function pickHook(lead) {
  const gap = HOOK_ORDER.find((g) => lead.gaps?.includes(g));
  return gap ? { gap, text: HOOKS[gap](lead) } : { gap: null, text: null };
}

function trade(lead) {
  return lead.category === 'motorcycle_repair' ? 'bike workshops' : 'garages';
}

function signature(sender) {
  return [
    sender.name,
    sender.business || null,
    sender.phone || null,
    sender.email || null,
    sender.website || null,
    sender.postalAddress || null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildEmail(lead, config, hook) {
  const s = config.sender;
  const town = lead.town || 'Hertfordshire';
  const subject = hook.gap
    ? `Missed calls at ${lead.name}?`
    : `Quick question about bookings at ${lead.name}`;

  const opener = hook.text
    ? `I had a look at ${lead.name} before getting in touch and noticed ${hook.text}.`
    : `I work with independent ${trade(lead)} around ${town} on the one problem nobody has time to fix: the phone.`;

  const body = `Hi ${lead.contactFirstName || 'there'},

${opener}

I set up an AI receptionist for independent ${trade(lead)}. It answers every call in your name, day or night, takes the reg and the job, books it straight into your diary and texts the customer to confirm. If it cannot help, it takes a proper message and texts it to you — no more voicemail nobody listens to.

Most ${town} ${trade(lead)} I speak to are losing three to six jobs a week to calls that ring out while they are under a car. At an average ticket that is real money walking to the garage down the road.

${config.campaign.priceAnchor}. Worth a ten minute call to see if the numbers stack up for you?

${s.calendarLink ? `You can grab a slot here: ${s.calendarLink}\n\n` : ''}Best,
${signature(s)}

${config.compliance.optOutLine}`;

  return { subject, body };
}

function buildSms(lead, config, hook) {
  const s = config.sender;
  const line = hook.gap === 'no-online-booking'
    ? `noticed there's no online booking on your site`
    : hook.gap === 'mobile-mechanic'
    ? `noticed you work mobile so calls must get missed`
    : `noticed the phone is doing all the work for your bookings`;
  return `Hi, ${s.name} here. I ${line} at ${lead.name}. I set up an AI receptionist for local ${trade(lead)} — answers every call, books the job in your diary, texts the customer. ${config.campaign.priceAnchor.split(',')[0]}. OK if I send you a 60-second demo? Reply STOP to opt out.`;
}

function buildCallOpener(lead, config, hook) {
  const s = config.sender;
  const observed = hook.text || 'the phone is doing all the booking work';
  return `OPENER (say it in one breath, then stop talking)
"Morning — is that ${lead.name}? My name's ${s.name}, I'm local, ${lead.town || 'here in Hertfordshire'}. I'll be thirty seconds and then you can tell me to go away. I noticed ${observed}. I put in a thing that answers the phone when you can't and books the job straight into your diary. Is that a problem you have, or do you have it covered?"

IF "we manage fine":
"Fair enough. Out of interest, when you're under a car and the phone goes — who picks it up?" (Then listen. Nine times out of ten the answer is 'nobody'.)

IF "how much":
"${config.campaign.priceAnchor}. But the honest answer is it only makes sense if you're missing more than one job a month. Can I ask roughly how many calls you reckon you miss in a week?"

IF "send me something":
"Will do — best email for you? And can I put a fifteen minute call in for ${nextTuesday()}, so it doesn't just sit in your inbox?"

VOICEMAIL (leave it once, keep it under 20 seconds):
"Hi, it's ${s.name}, local ${lead.town || 'Hertfordshire'} — nothing to sell you today, just a quick question about how you handle calls when the workshop's busy. ${s.phone || '[your number]'}. That's ${s.phone || '[your number]'}. Thanks."

BEFORE DIALLING: confirm this number has been screened against TPS/CTPS.`;
}

function nextTuesday() {
  const d = new Date();
  d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7 || 7));
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function buildFollowUps(lead, config) {
  const s = config.sender;
  return [
    {
      day: 3,
      channel: 'email',
      subject: `Re: Missed calls at ${lead.name}?`,
      body: `Hi ${lead.contactFirstName || 'there'},

Bumping this once in case it got buried under a busy week.

The quickest way to see whether it is worth anything to you: next time the workshop is flat out, count how many times the phone rings and nobody gets to it. If the answer is zero, ignore me with my blessing.

${s.name}${s.phone ? ' — ' + s.phone : ''}

${config.compliance.optOutLine}`,
    },
    {
      day: 10,
      channel: 'email',
      subject: `Closing the loop, ${lead.name}`,
      body: `Hi ${lead.contactFirstName || 'there'},

Last one from me — I will not keep filling your inbox.

If the phone ever becomes the bottleneck rather than the work, I am local and easy to find${s.phone ? ` on ${s.phone}` : ''}. Good luck with the year.

${s.name}

${config.compliance.optOutLine}`,
    },
  ];
}

export function buildOutreach(leads, config) {
  const sup = loadSuppression();
  for (const lead of leads) {
    const policy = contactPolicy(lead, config, sup);
    lead.contactPolicy = policy;

    if (policy.suppressed) {
      lead.outreach = { suppressed: policy.suppressed };
      continue;
    }

    const hook = pickHook(lead);
    lead.outreach = {
      hookGap: hook.gap,
      email: buildEmail(lead, config, hook),
      sms: buildSms(lead, config, hook),
      callScript: buildCallOpener(lead, config, hook),
      followUps: buildFollowUps(lead, config),
      readyToEmail: policy.emailAllowed,
      readyToCall: policy.callAllowed,
    };
    if (!lead.contactStatus) lead.contactStatus = 'new';
  }
  return leads;
}
