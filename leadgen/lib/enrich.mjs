/**
 * Visits each lead's own website and works out how they take bookings.
 * That single fact is what the whole pitch turns on: a garage with no
 * online booking takes every job through a phone that rings out while
 * the owner is under a car.
 *
 * Polite by construction: obeys robots.txt, identifies itself, one site at
 * a time, a configurable delay between requests, a hard page cap per site.
 */
import { fetchWithRetry, sleep, log, extractEmails, extractPhones, extractPostcode, normalisePhone } from './util.mjs';

const BOOKING_PLATFORMS = [
  { re: /bookmygarage/i, name: 'BookMyGarage' },
  { re: /garagehive/i, name: 'Garage Hive' },
  { re: /whocanfixmycar/i, name: 'WhoCanFixMyCar' },
  { re: /motasoft|gemboxx/i, name: 'MotaSoft' },
  { re: /calendly/i, name: 'Calendly' },
  { re: /setmore/i, name: 'Setmore' },
  { re: /acuityscheduling|squarespacescheduling/i, name: 'Acuity' },
  { re: /simplybook\.(me|it)/i, name: 'SimplyBook' },
  { re: /bookinglive|10to8|timely|treatwell/i, name: 'Booking widget' },
  { re: /clickmechanic/i, name: 'ClickMechanic' },
  { re: /fixter/i, name: 'Fixter' },
];

const CHAT_WIDGETS = [
  { re: /tawk\.to/i, name: 'Tawk.to' },
  { re: /crisp\.chat/i, name: 'Crisp' },
  { re: /intercom/i, name: 'Intercom' },
  { re: /livechatinc|livechat\.com/i, name: 'LiveChat' },
  { re: /tidio/i, name: 'Tidio' },
  { re: /zendesk|zopim/i, name: 'Zendesk Chat' },
  { re: /smartsupp|chatra|olark|drift\.com/i, name: 'Chat widget' },
];

const ANSWERING_SERVICE = /(24\/7 answering|answering service|virtual receptionist|call answering|moneypenny|alldayp|ai receptionist|answered 24)/i;

async function robotsAllows(origin, ua, timeoutMs) {
  try {
    const res = await fetchWithRetry(
      origin + '/robots.txt',
      { headers: { 'User-Agent': ua } },
      { retries: 0, timeoutMs }
    );
    if (!res.ok) return { allowed: true, rules: [] };
    const txt = await res.text();
    const disallows = [];
    let applies = false;
    for (const line of txt.split(/\r?\n/)) {
      const l = line.split('#')[0].trim();
      if (!l) continue;
      const [rawKey, ...rest] = l.split(':');
      const key = rawKey.trim().toLowerCase();
      const val = rest.join(':').trim();
      if (key === 'user-agent') applies = val === '*' || ua.toLowerCase().includes(val.toLowerCase());
      else if (key === 'disallow' && applies && val) disallows.push(val);
    }
    return { allowed: true, rules: disallows };
  } catch {
    return { allowed: true, rules: [] };
  }
}

function pathAllowed(pathname, rules) {
  return !rules.some((r) => r === '/' || pathname.startsWith(r));
}

export function analyseHtml(html) {
  const lower = html.toLowerCase();

  const bookingPlatform = BOOKING_PLATFORMS.find((p) => p.re.test(html))?.name || null;
  const chatWidget = CHAT_WIDGETS.find((p) => p.re.test(html))?.name || null;

  // A real booking form needs a date/time input or an obvious booking action.
  const hasDateInput = /<input[^>]+type=["']?(date|datetime-local|time)["']?/i.test(html);
  const hasBookingCta = /(book\s*(your|a|an|my)?\s*(mot|service|slot|appointment|repair|online)|book\s*now|request\s*(a\s*)?(booking|appointment))/i.test(lower);
  const hasForm = /<form[\s>]/i.test(html);
  const hasEmailField = /<input[^>]+type=["']?email["']?/i.test(html) || /name=["'][^"']*email/i.test(html);
  const hasContactForm = hasForm && (hasEmailField || /<textarea/i.test(html));

  const hasOnlineBooking = Boolean(bookingPlatform) || (hasForm && hasDateInput) || (hasForm && hasBookingCta && hasDateInput);

  const whatsappMatch = html.match(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?(\+?\d{7,15})/i);

  const callOnlyPhrases = /(call us to book|please call to book|to book (?:an? )?(?:appointment|mot|service),? (?:please )?call|phone (?:us )?to book|ring us to book|call for (?:an? )?appointment)/i.test(lower);

  return {
    bookingPlatform,
    hasOnlineBooking,
    hasContactForm,
    hasBookingCta,
    chatWidget,
    whatsapp: whatsappMatch ? whatsappMatch[1] : null,
    callToBookOnly: callOnlyPhrases,
    mentionsAnsweringService: ANSWERING_SERVICE.test(html),
    hasViewportMeta: /<meta[^>]+name=["']viewport["']/i.test(html),
    isHttps: null,
    copyrightYear: (() => {
      const years = [...html.matchAll(/(?:©|&copy;|copyright)[^0-9]{0,20}(20\d{2})/gi)].map((m) => Number(m[1]));
      return years.length ? Math.max(...years) : null;
    })(),
    mentionsMobileMechanic: /mobile (mechanic|motorcycle|motorbike|servicing|tyre)/i.test(lower),
    mentionsOutOfHours: /(out of hours|evening appointments|open sunday|24 hour|24hr|late night)/i.test(lower),
  };
}

function mergeAnalysis(target, part) {
  for (const [k, v] of Object.entries(part)) {
    if (v === null || v === false || v === undefined) continue;
    if (target[k] === null || target[k] === false || target[k] === undefined) target[k] = v;
    else if (k === 'copyrightYear') target[k] = Math.max(target[k], v);
  }
  return target;
}

export async function enrichLead(lead, config) {
  const cfg = config.enrich;
  const result = {
    enrichedAt: new Date().toISOString(),
    websiteReachable: false,
    websiteStatus: null,
    pagesChecked: [],
    emails: [],
    phones: [],
    analysis: null,
    enrichError: null,
  };

  if (!lead.website) {
    result.enrichError = 'no-website';
    return result;
  }

  let origin;
  try {
    origin = new URL(lead.website).origin;
  } catch {
    result.enrichError = 'bad-url';
    return result;
  }

  const { rules } = await robotsAllows(origin, cfg.userAgent, cfg.timeoutMs);
  const analysis = {};
  const emails = new Set();
  const phones = new Map();

  let checked = 0;
  for (const p of cfg.candidatePaths) {
    if (checked >= cfg.maxPagesPerSite) break;
    const url = origin + p;
    if (!pathAllowed(p, rules)) {
      result.pagesChecked.push({ url, skipped: 'robots.txt' });
      continue;
    }
    let res;
    try {
      res = await fetchWithRetry(
        url,
        { headers: { 'User-Agent': cfg.userAgent, Accept: 'text/html,application/xhtml+xml' } },
        { retries: 1, timeoutMs: cfg.timeoutMs }
      );
    } catch (err) {
      result.pagesChecked.push({ url, error: err.message });
      // A connection-level failure on the homepage means the host itself is
      // unreachable. Trying the other paths just burns a timeout each.
      if (!result.websiteReachable) {
        result.enrichError = 'unreachable';
        break;
      }
      await sleep(cfg.delayMsBetweenRequests);
      continue;
    }
    if (result.websiteStatus === null) result.websiteStatus = res.status;
    if (!res.ok) {
      result.pagesChecked.push({ url, status: res.status });
      await sleep(cfg.delayMsBetweenRequests);
      continue;
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('html')) {
      await sleep(cfg.delayMsBetweenRequests);
      continue;
    }

    const html = (await res.text()).slice(0, 400000);
    result.websiteReachable = true;
    checked++;
    result.pagesChecked.push({ url, status: res.status });

    mergeAnalysis(analysis, analyseHtml(html));
    for (const e of extractEmails(html)) emails.add(e);
    for (const ph of extractPhones(html)) phones.set(ph.e164, ph);
    if (!lead.postcode) {
      const pc = extractPostcode(html.replace(/<[^>]+>/g, ' '));
      if (pc) result.postcode = pc;
    }

    await sleep(cfg.delayMsBetweenRequests);
  }

  // Only publish an analysis if a page was actually read. Otherwise the
  // scorer would read "no booking form found" off a site it never opened and
  // score an unreachable business as a hot lead.
  if (result.websiteReachable) {
    analysis.isHttps = origin.startsWith('https://');
    result.analysis = analysis;
  } else {
    result.analysis = null;
  }
  result.emails = [...emails];
  result.phones = [...phones.values()].map((p) => p.e164);

  if (!result.websiteReachable && !result.enrichError) result.enrichError = 'unreachable';
  return result;
}

export async function enrichAll(leads, config, { limit = Infinity, force = false } = {}) {
  let done = 0;
  for (const lead of leads) {
    if (done >= limit) break;
    if (lead.enrichment && !force) continue;
    const r = await enrichLead(lead, config);
    lead.enrichment = r;

    // Promote anything useful the site told us onto the lead itself.
    if (!lead.email && r.emails.length) {
      lead.email = r.emails.find((e) => /^(info|enquiries|sales|bookings|service|office|contact|admin)@/.test(e)) || r.emails[0];
    }
    if (!lead.postcode && r.postcode) lead.postcode = r.postcode;
    if (!lead.phoneE164 && r.phones.length) {
      const n = normalisePhone(r.phones[0]);
      if (n) {
        lead.phoneE164 = n.e164;
        lead.phoneNational = n.national;
        lead.phoneType = n.type;
        lead.phoneVerified = true;
      }
    } else if (lead.phoneE164 && r.phones.includes(lead.phoneE164)) {
      lead.phoneVerified = true; // the number we had is confirmed on their own site
    }

    done++;
    log(
      `enrich ${done}: ${lead.name} — ${
        r.enrichError
          ? r.enrichError
          : `booking:${r.analysis?.hasOnlineBooking ? r.analysis.bookingPlatform || 'form' : 'none'} email:${lead.email || '—'}`
      }`
    );
  }
  return leads;
}
