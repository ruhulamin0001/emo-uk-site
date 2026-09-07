/**
 * Logo theke icon o OG chobi banano - logo bodlale ABAR chalaben.
 *
 *   npx tsx scripts/make-icons.ts
 *
 * Utso: public/logo.svg (malik er dewa purno wordmark) ar
 * public/icon.svg (sudhu chinho tuku, borgakar). Toiri hoy:
 *   public/icon-192.png, public/icon-512.png  - favicon + PWA
 *   public/og.png (1200x630)                  - social share card
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const pub = join(__dirname, '..', 'public');

async function main() {
  const icon = readFileSync(join(pub, 'icon.svg'));
  const logo = readFileSync(join(pub, 'logo.svg'));

  for (const size of [192, 512]) {
    await sharp(icon, { density: 300 })
      .resize(size, size)
      .flatten({ background: '#FFFFFF' })
      .png()
      .toFile(join(pub, `icon-${size}.png`));
    console.log(`icon-${size}.png toiri`);
  }

  /* OG card - sada background e majhkhane logo */
  const logoPng = await sharp(logo, { density: 300 })
    .resize(900, null, { fit: 'inside' })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: '#FFFFFF' },
  })
    .composite([{ input: logoPng, gravity: 'centre' }])
    .png()
    .toFile(join(pub, 'og.png'));
  console.log('og.png toiri');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
