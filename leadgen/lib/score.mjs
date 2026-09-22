/**
 * Scores how badly a business needs an AI receptionist, and how likely
 * they are to buy one. Every point carries a human-readable reason, because
 * the reasons are what you actually say on the call.
 */

function hoursSay(lead, re) {
  const h = lead.openingHours;
  if (!h) return false;
  return (Array.isArray(h) ? h : [h]).some((line) => re.test(String(line)));
}

function closedAtWeekend(lead) {
  const h = lead.openingHours;
  if (!Array.isArray(h)) return false;
  const weekend = h.filter((l) => /^(saturday|sunday)/i.test(l));
  if (!weekend.length) return false;
  return weekend.some((l) => /closed/i.test(l));
}

/**
 * Signals we can read off the listing itself, without opening the website.
 * The seed and the directory sources describe a lot of businesses as mobile
 * mechanics or 24-hour recovery operators, and that is worth as much as
 * anything the site would have told us.
 */
function noteSays(lead, re) {
  return re.test(`${lead.sourceNote || ''} ${lead.name || ''}`);
}

export function scoreLead(lead, config) {
  const a = lead.enrichment?.analysis || null;
  const reasons = [];
  const gaps = [];
  let score = 0;

  const add = (points, reason, gap) => {
    score += points;
    reasons.push({ points, reason });
    if (gap) gaps.push(gap);
  };

  /* ---- need signals ---- */

  if (lead.website && a) {
    if (!a.hasOnlineBooking) {
      add(25, 'No online booking on their website — every job has to come through the phone', 'no-online-booking');
    } else {
      add(-25, `Already books online via ${a.bookingPlatform || 'a form on the site'}`);
    }
    if (a.callToBookOnly) add(10, 'Site explicitly tells customers to call to book', 'call-to-book-only');
    if (!a.hasContactForm) add(8, 'No contact form at all — phone or nothing', 'no-contact-form');
    if (!a.chatWidget) add(4, 'No live chat, so no way to catch a customer who will not phone');
    if (a.whatsapp) add(-4, 'Already takes WhatsApp enquiries');
    if (a.mentionsAnsweringService) add(-20, 'Already mentions an answering service or virtual receptionist');
    if (a.mentionsMobileMechanic) add(12, 'Mobile mechanic — physically cannot answer while working on a vehicle', 'mobile-mechanic');
    if (!a.hasViewportMeta) add(5, 'Website is not mobile-friendly — the phone carries even more of the load');
    if (a.copyrightYear && a.copyrightYear <= new Date().getFullYear() - 3) {
      add(5, `Website looks unmaintained (copyright ${a.copyrightYear}) — nobody is optimising their lead capture`);
    }
  } else if (!lead.website) {
    add(18, 'No website found — the phone is their only channel', 'no-website');
  }

  // Read off the listing when the site was never opened, so a mobile mechanic
  // is still recognised as one in a run that could not enrich.
  if (!a) {
    if (noteSays(lead, /mobile mechanic|mobile motorcycle|mobile repairs|comes to you/i)) {
      add(12, 'Described as a mobile mechanic — physically cannot answer while working on a vehicle', 'mobile-mechanic');
    }
    if (noteSays(lead, /24[- ]?hour recovery|recovery line|breakdown/i)) {
      add(8, 'Runs a recovery or breakdown line — a missed call is a stranded customer ringing somebody else', 'recovery-line');
    }
    if (noteSays(lead, /bookmygarage|fixter|book(s|able)? online|online booking/i)) {
      add(-20, 'Listing shows they already take online bookings through a third-party platform');
    }
  }

  if (lead.enrichment?.enrichError === 'unreachable' && lead.website) {
    add(10, 'Website did not respond — enquiries are almost certainly going to voicemail instead', 'site-down');
  }

  if (closedAtWeekend(lead)) add(10, 'Closed at the weekend — every Saturday and Sunday call is lost', 'closed-weekend');
  if (hoursSay(lead, /5:?0?0.?pm|17:00/i) && !hoursSay(lead, /(6|7|8):?\d*\s?pm|1[89]:00/i)) {
    add(5, 'Closes around 5pm — after-work callers cannot reach them');
  }

  const rs = lead.reviewSignals;
  if (rs?.missedCallMentions > 0) {
    add(Math.min(22, 12 + rs.missedCallMentions * 5), `${rs.missedCallMentions} Google review(s) complain about unanswered calls`, 'reviews-missed-calls');
  }

  /* ---- ability and willingness to pay ---- */

  if (lead.rating != null && lead.reviewCount != null) {
    if (lead.rating >= 4.3 && lead.reviewCount >= 30) add(10, `Well rated and busy (${lead.rating}★ from ${lead.reviewCount} reviews) — demand is there, capacity to answer is not`);
    else if (lead.rating >= 4.0 && lead.reviewCount >= 10) add(5, `Solid reputation (${lead.rating}★, ${lead.reviewCount} reviews)`);
    else if (lead.rating < 3.5 && lead.reviewCount >= 10) add(-8, `Weak reputation (${lead.rating}★) — likely to be price-driven and hard to close`);
  }
  if (lead.reviewCount != null && lead.reviewCount < 5) add(-5, 'Very few reviews — may be too small or too new to spend');

  const nameLower = (lead.name || '').toLowerCase();
  if (config.exclude.franchiseHints.some((h) => nameLower.includes(h))) {
    add(-25, 'Reads like a franchise or main dealer — the decision is made centrally, not locally');
  }
  if (/\b(ltd|limited|plc|llp)\b/i.test(lead.name)) add(4, 'Registered company — cleaner route for B2B email under PECR');

  /* ---- reachability of the lead itself ---- */

  if (lead.phoneE164) add(6, 'Direct phone number on file');
  if (lead.email) add(6, 'Direct email address on file');
  if (!lead.phoneE164 && !lead.email) add(-15, 'No way to contact them yet — needs manual lookup first');

  if (lead.category === 'motorcycle_repair') add(3, 'Bike workshops are usually one or two people — nobody spare to pick up');

  score = Math.max(0, Math.min(100, Math.round(score)));

  // A lead whose website was never read cannot reach the same score as one
  // that was: roughly two thirds of the available points come from the site
  // analysis. Banding both against the enriched thresholds would park every
  // unenriched lead in tier C and leave the call list empty, so each basis
  // gets its own cut points. The score is unchanged either way — only the
  // "call first / call later" split moves, and the basis travels with it so
  // a provisional A is never mistaken for a verified one.
  const basis = a ? 'enriched' : 'provisional';
  const bands = basis === 'enriched' ? config.scoring : config.scoring.provisional || config.scoring;
  const tier = score >= bands.tierA ? 'A' : score >= bands.tierB ? 'B' : 'C';

  return { score, tier, basis, reasons: reasons.sort((x, y) => y.points - x.points), gaps };
}

export function scoreAll(leads, config) {
  for (const lead of leads) {
    const r = scoreLead(lead, config);
    lead.score = r.score;
    lead.tier = r.tier;
    lead.scoreBasis = r.basis;
    lead.scoreReasons = r.reasons;
    lead.gaps = r.gaps;
  }
  leads.sort((a, b) => b.score - a.score);
  return leads;
}
