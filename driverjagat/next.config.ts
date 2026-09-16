import type { NextConfig } from 'next';

/**
 * CSP - Content Security Policy.
 *
 * Ei ta XSS er DWITIYO stor. Amra React use kori bole prothom
 * stor ta emni te ache (React sob string escape kore), kintu
 * kono ekdin kono ekta jaygay `dangerouslySetInnerHTML` dhukle,
 * ba kono library XSS anle - ei header ta tokhon browser ke
 * bole "amar nijer domain er script chhara ar kichhu chalio na".
 *
 * SCRIPT e `'unsafe-inline'` LAGE - ei ta shokh kore na.
 *
 * Prothome `script-src 'self'` diyechilam, ar seta puro site
 * BHENGE dilo - browser e 40+ ta CSP error, "Connection closed",
 * pata i lode holo na. Karon Next.js NIJE inline script boshay
 * (hydration bootstrap, RSC payload). Oi gulo block hole React
 * chalu i hoy na.
 *
 * Nonce diye ei ta thik kora jeto, kintu nonce protita request e
 * middleware theke bosate hoy - ar amader middleware Edge
 * runtime e, okhane ei kaj kora jotil ar bhongur. Ekta bhul
 * nonce = puro site abar mora.
 *
 * Tai XSS er asol pahara ekhane `'unsafe-inline'` na - oita:
 *   • React sob string escape kore (prothom stor)
 *   • `object-src 'none'` - Flash/plugin diye script chalano bondho
 *   • `base-uri 'self'` - <base> tag diye script hijack bondho
 *   • `form-action 'self'` - form onno site e post kora bondho
 *   • `frame-ancestors 'none'` - clickjacking bondho
 * Ei gulo XSS er RUCHIKOR angsho - inline block ta na, karon
 * seta Next er sathe chole na.
 *
 * Firebase auth ar firestore browser theke direct kotha bole,
 * tai `connect-src` e tader domain gulo lage. Na dile login i
 * bhengе jeto.
 */
/**
 * Emulator er host gulo SUDHU dev e - production CSP e ei
 * string ta FAKA. Na dile local e client SDK (auth, storage
 * upload) er protita call CSP e atke jeto, ar console e sudhu
 * "Failed to fetch" dekhato - karon ta bojha jeto na.
 * (MarriageJagat e thik ei bhabe i dhora poreche.)
 */
const emulatorConnect =
  process.env.NODE_ENV !== 'production'
    ? ' http://127.0.0.1:9099 http://localhost:9099 http://127.0.0.1:8080 http://localhost:8080 http://127.0.0.1:9199 http://localhost:9199'
    : '';
const emulatorImg =
  process.env.NODE_ENV !== 'production'
    ? ' http://127.0.0.1:9199 http://localhost:9199'
    : '';

const csp = [
  "default-src 'self'",
  /**
   * apis.google.com LAGBE I - Firebase er Google popup login
   * oi khan theke gapi script ane. Na dile production e "লগইন
   * করা যায়নি" ashe ar console e CSP block dekha jay - emulator
   * e dhora pore NA, karon emulator popup ei rasta i ney na.
   * (driverjagat.com live howar prothom raat e dhora pora bug.)
   */
  /* www.gstatic.com - /__/auth/* proxy pata gulo (niche rewrites())
     oi khan theke nijer script ane */
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.googleusercontent.com" +
    emulatorImg,
  "font-src 'self'",
  "connect-src 'self' https://*.googleapis.com https://apis.google.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com" +
    emulatorConnect,
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  /* Hostinger VPS e Docker container hishebe cholbe - Vercel na.
     `standalone` na dile container e puro node_modules dhukbe. */
  output: 'standalone',

  /**
   * Google login er popup e "com-example-mosqueofuk...firebaseapp.com"
   * na dekhiye "driverjagat.com" dekhanor kol (malik: "bichhiri dekhay").
   *
   * Firebase auth helper pata gulo (/__/auth/*) asole firebaseapp.com
   * e thake. authDomain=driverjagat.com kore dile browser AMADER domain
   * e oi pata khoje - ei rewrite ta chupchap asol jaygay pouchhe dey.
   * Sathe GCP OAuth client e driverjagat.com origin + redirect URI
   * joga kora hoyeche (2 Sep 2026) - ei duita EK SHATHE lage.
   */
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com/__/auth/:path*`,
      },
    ];
  },

  reactStrictMode: true,

  /**
   * "X-Powered-By: Next.js" faas kora bondho.
   *
   * Ei header ta hacker ke bole diyechilo amra ki chalachhi -
   * tarpor se sudhu "Next.js CVE" khujto. Chhoto jinish, kintu
   * bina karone shotru ke amader hater tas dekhano.
   */
  poweredByHeader: false,

  images: {
    // Firebase Storage er signed URL theke chobi ashbe
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ],
  },

  eslint: {
    dirs: ['src'],
  },

  /**
   * Nirapottar header - protita response e.
   *
   * Traefik-o kichhu header dey (HSTS, frame-deny), kintu ei gulo
   * app er NIJER - Traefik bodlaleo thakbe. Duijaygay thakle
   * ekta bad porleo onnota dhore.
   */
  async headers() {
    return [
      /**
       * /__/auth/* ALADA - oi pata gulo Firebase er auth helper,
       * amader page NIJEI oigulo iframe e boshay. Catch-all er
       * X-Frame-Options: DENY + frame-ancestors 'none' oi iframe ke i
       * mere dicchilo ("Refused to display ... X-Frame-Options") -
       * Google login majh pothe atke jeto. Tai niche catch-all theke
       * bad (negative lookahead), ekhane SAMEORIGIN.
       */
      {
        source: '/__/auth/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      {
        source: '/((?!__/auth).*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            /* Camera, mic, payment API - amra kichhu i use kori na, sob
               bondho. Geolocation `self` - "amar kachhe" feature ta lage. */
            value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
