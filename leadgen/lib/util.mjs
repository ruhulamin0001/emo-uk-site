import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function log(...args) {
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args);
}

export function readJSON(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

export function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

/* ---------------- UK phone numbers ---------------- */

// Returns { e164, national, type } or null.
export function normalisePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+44')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('0044')) digits = '0' + digits.slice(4);
  else if (digits.startsWith('44') && digits.length >= 12) digits = '0' + digits.slice(2);
  digits = digits.replace(/\+/g, '');
  if (!digits.startsWith('0')) return null;
  if (digits.length < 10 || digits.length > 11) return null;
  const type = digits.startsWith('07') ? 'mobile' : digits.startsWith('08') || digits.startsWith('09') ? 'premium' : 'landline';
  return { e164: '+44' + digits.slice(1), national: digits, type };
}

const PHONE_RE = /(?:\+44\s?|\(?0)(?:\d[\d\s().-]{8,13}\d)/g;

export function extractPhones(text) {
  const out = new Map();
  for (const m of String(text).matchAll(PHONE_RE)) {
    const n = normalisePhone(m[0]);
    if (n && n.type !== 'premium') out.set(n.e164, n);
  }
  return [...out.values()];
}

/* ---------------- UK postcodes ---------------- */

const POSTCODE_RE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/gi;

export function extractPostcode(text) {
  const m = POSTCODE_RE.exec(String(text));
  POSTCODE_RE.lastIndex = 0;
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : null;
}

export function outwardCode(postcode) {
  if (!postcode) return null;
  return String(postcode).trim().split(/\s+/)[0].toUpperCase();
}

export function isInArea(postcode, prefixes) {
  const out = outwardCode(postcode);
  if (!out) return null; // unknown, not a rejection
  return prefixes.includes(out);
}

/* ---------------- emails ---------------- */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const EMAIL_JUNK = /\.(png|jpe?g|gif|webp|svg|css|js)$/i;
const EMAIL_BLOCKLIST = /(sentry|wixpress|example\.|domain\.com|yourname|@2x|godaddy|squarespace|sentry\.io)/i;

export function extractEmails(text) {
  const out = new Set();
  for (const m of String(text).matchAll(EMAIL_RE)) {
    const e = m[0].toLowerCase();
    if (EMAIL_JUNK.test(e) || EMAIL_BLOCKLIST.test(e)) continue;
    out.add(e);
  }
  return [...out];
}

/* ---------------- misc ---------------- */

export function domainOf(url) {
  if (!url) return null;
  try {
    return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function leadId(lead) {
  const key =
    domainOf(lead.website) ||
    lead.phoneE164 ||
    `${(lead.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}|${outwardCode(lead.postcode) || lead.town || ''}`;
  return crypto.createHash('sha1').update(String(key)).digest('hex').slice(0, 12);
}

export function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function titleCase(s) {
  return String(s).replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1));
}

/** First name-ish token to address a business owner politely without guessing a person. */
export function greetingFor(lead) {
  return lead.contactFirstName ? lead.contactFirstName : 'there';
}

export function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = Array.isArray(v) ? v.join(' | ') : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(rows, columns) {
  const head = columns.join(',');
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(','));
  return [head, ...body].join('\n') + '\n';
}

/** fetch with timeout + retry/backoff. Node 22 built-in fetch. */
export async function fetchWithRetry(url, options = {}, { retries = 2, timeoutMs = 20000, backoffMs = 1500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: ac.signal, redirect: 'follow' });
      clearTimeout(t);
      if (res.status >= 500 && attempt < retries) {
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(t);
      lastErr = err;
      if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
    }
  }
  throw lastErr;
}

export function parseArgs(argv) {
  const out = { _: [] };
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v === undefined ? true : v;
    } else out._.push(a);
  }
  return out;
}
