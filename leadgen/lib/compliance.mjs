/**
 * UK marketing rules, applied before a single message is generated.
 *
 * The short version:
 *  - Cold B2B email to a "corporate subscriber" (Ltd, PLC, LLP) is allowed
 *    under PECR, provided you identify yourself and offer a working opt-out.
 *  - Sole traders and ordinary partnerships count as individuals. Emailing
 *    them cold is not covered by the corporate exemption, so this tool
 *    routes them to phone or post instead of generating an email.
 *  - Every phone number must be screened against TPS/CTPS before you call.
 *    That screening is a paid service and is not automated here — the tool
 *    refuses to mark a lead call-ready until you record the check.
 */
import { readJSON } from './util.mjs';

const SUPPRESSION_FILE = 'leadgen/data/suppression.json';

export function loadSuppression() {
  const data = readJSON(SUPPRESSION_FILE, { emails: [], phones: [], domains: [], names: [] });
  return {
    emails: new Set((data.emails || []).map((e) => e.toLowerCase())),
    phones: new Set(data.phones || []),
    domains: new Set((data.domains || []).map((d) => d.toLowerCase())),
    names: new Set((data.names || []).map((n) => n.toLowerCase())),
  };
}

export function isSuppressed(lead, sup) {
  if (lead.email && sup.emails.has(lead.email.toLowerCase())) return 'email on suppression list';
  if (lead.phoneE164 && sup.phones.has(lead.phoneE164)) return 'phone on suppression list';
  if (lead.domain && sup.domains.has(lead.domain)) return 'domain on suppression list';
  if (lead.name && sup.names.has(lead.name.toLowerCase())) return 'business on suppression list';
  return null;
}

export function classifyEntity(lead, config) {
  const n = (lead.name || '').toLowerCase();
  const isCorporate = config.compliance.corporateSuffixes.some((s) => new RegExp(`\\b${s.replace('.', '\\.')}(\\b|$)`).test(n));
  return isCorporate ? 'corporate' : 'unincorporated';
}

export function contactPolicy(lead, config, sup) {
  const suppressed = isSuppressed(lead, sup);
  const entityType = classifyEntity(lead, config);
  const ctpsChecked = lead.ctpsCheckedAt ? true : false;

  const policy = {
    entityType,
    suppressed,
    emailAllowed: false,
    emailNote: '',
    callAllowed: false,
    callNote: '',
  };

  if (suppressed) {
    policy.emailNote = policy.callNote = `Do not contact — ${suppressed}`;
    return policy;
  }

  if (!lead.email) {
    policy.emailNote = 'No email address on file yet';
  } else if (entityType === 'corporate') {
    policy.emailAllowed = true;
    policy.emailNote = 'Corporate subscriber — cold B2B email permitted with sender identity and opt-out';
  } else {
    policy.emailNote =
      'Looks like a sole trader or partnership. Under PECR these count as individuals, so do not cold email — call (after TPS/CTPS screening), post a letter, or ask permission in person first';
  }

  if (!lead.phoneE164) {
    policy.callNote = 'No phone number on file yet';
  } else if (config.compliance.requireCtpsCheckBeforeCalling && !ctpsChecked) {
    policy.callNote = 'Screen this number against TPS/CTPS first, then set ctpsCheckedAt on the lead';
  } else {
    policy.callAllowed = true;
    policy.callNote = ctpsChecked ? `TPS/CTPS checked ${lead.ctpsCheckedAt}` : 'TPS/CTPS check not required by config';
  }

  return policy;
}
