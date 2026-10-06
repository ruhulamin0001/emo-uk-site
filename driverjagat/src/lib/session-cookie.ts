/**
 * Sudhu cookie r NAM o meyad - ar kichu na.
 *
 * Ei file e KONO import NAI, ar thakbeo na.
 *
 * Karon: middleware.ts Edge runtime e chole, sekhane Node er
 * `crypto` nai. Ei mullo gulo age lib/server/session.ts e chilo,
 * ar oi file Firebase Admin ane - mane node:crypto ane. Tate
 * middleware BHENGE jeto ("Cannot find module 'node:crypto'"),
 * ar protected pata gulo 500 dito.
 *
 * Tai nam ta alada file e - Edge o Node duijaygay chole.
 */

export const SESSION_COOKIE = 'tj_session';

/** 14 din - tarpor abar login */
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
