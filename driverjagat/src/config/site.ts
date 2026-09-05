/**
 * Site-wide constants.
 *
 * Ekhane sob kichu ek jaygay - nam, domain, jogajog. Kono component e
 * hardcode korben na. Jogajog bodlale sudhu ei file ta bodlabe.
 *
 * Domain (D-006): apatoto driver.jagatitlimited.com e deploy hobe,
 * pore driverjagat.com kena hole bodlabe. Bodlale: ei file +
 * docker-compose.yml + Firebase authorized domains, ar kichu na.
 */

export const siteConfig = {
  name: 'DriverJagat',
  nameBn: 'ড্রাইভার জগত',

  /** Wordmark: "Driver" brand rong e, "Jagat" ink e - TutorJagat er niyom */
  wordmark: { first: 'Driver', second: 'Jagat' },

  tagline: 'যাচাই করা ড্রাইভার, দালাল ছাড়া - সারা বাংলাদেশে',
  description:
    'বাংলাদেশের ড্রাইভার আর গাড়ির মালিকদের যোগাযোগের যাচাই করা মাধ্যম। প্রতিটি ড্রাইভার চাই পোস্ট অ্যাডমিন যাচাই করে প্রকাশ করা হয় - ভুয়া পোস্ট নেই, দালাল নেই। মালিকের ফোন নম্বর ও ঠিকানা কখনো প্রকাশ্যে যায় না - দুই পক্ষ রাজি হলে অ্যাডমিন নিজে যোগাযোগ করিয়ে দেন।',

  domain: 'driver.jagatitlimited.com',
  url: 'https://driver.jagatitlimited.com',

  support: {
    phone: '+8801993636140',
    /** WhatsApp link er jonno - sudhu digit, + chara */
    whatsapp: '8801993636140',
    email: 'support@jagatitlimited.com',
  },

  /** Tracking code prefix - DJ-HD-00123 (lib/tracking-code.ts).
      Live e ASOL job asar por ar KOKHONO bodlano jabe na -
      purono code gulo track page e ar milto na. */
  trackingPrefix: 'DJ',

  locale: 'bn-BD',
  currency: 'BDT',
  currencySymbol: '৳',
  timezone: 'Asia/Dhaka',
} as const;

export type SiteConfig = typeof siteConfig;
