import Link from 'next/link';
import type { JobView } from '@/lib/server/jobs';
import {
  JOB_TYPE,
  JOB_TYPE_LABEL,
  LICENSE_TYPE_LABEL,
  RESIDENCE_LABEL,
  VEHICLE_TYPE_LABEL,
} from '@/types/enums';
import { findArea, findDistrict } from '@/lib/locations';
import { monthBn, taka, toBn } from '@/lib/format';
import { photoUrl } from '@/lib/photo-url';

const lbl = (map: Record<string, string>, key: unknown): string =>
  key ? (map[String(key)] ?? '') : '';

/**
 * Feed er card.
 *
 * Ekhane SUDHU `JobView` er ghor - ar oi view ta
 * lib/server/jobs.ts er PUBLIC_CARD_FIELDS talika theke ashe.
 * Malik er nam, phone, purno thikana ei component e ASHTE I PARE NA.
 * leadCount O na - gonona admin er, card er na.
 */
export function JobCard({ b }: { b: JobView }) {
  const district = findDistrict(String(b.districtId ?? ''));
  const area = findArea(String(b.areaId ?? ''));
  const photos = Array.isArray(b.photoPaths) ? (b.photoPaths as string[]) : [];
  const isFullTime = b.jobType === JOB_TYPE.full_time;
  const exp = Number(b.experienceYearsMin ?? 0);

  return (
    <Link
      href={`/jobs/${String(b.trackingCode)}`}
      className="block overflow-hidden rounded-lg border border-ink-200 bg-white transition-shadow hover:shadow-md"
    >
      {photos.length > 0 ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photoUrl(photos[0])}
          alt="গাড়ির ছবি"
          loading="lazy"
          className="h-40 w-full object-cover"
        />
      ) : null}

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`rounded-full px-3 py-0.5 text-sm font-semibold ${
              isFullTime ? 'bg-brand-50 text-brand-700' : 'bg-info-bg text-info'
            }`}
          >
            {lbl(VEHICLE_TYPE_LABEL, b.vehicleType)}
          </span>
          <span className="font-mono text-xs text-ink-400">{String(b.trackingCode)}</span>
        </div>

        <div className="mt-2 text-lg font-bold text-ink-900">
          {taka(Number(b.salary ?? 0))}
          <span className="text-sm font-normal text-ink-500"> / মাস</span>
          {b.salaryNegotiable ? (
            <span className="ml-2 text-xs font-normal text-ink-400">আলোচনা সাপেক্ষে</span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-800">
          <span>{lbl(JOB_TYPE_LABEL, b.jobType)}</span>
          {area ? <span>{area.bn}</span> : district ? <span>{district.bn}</span> : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {b.licenseRequired ? (
            <span className="rounded bg-success-bg px-2 py-0.5 text-xs text-success">
              {lbl(LICENSE_TYPE_LABEL, b.licenseRequired)} লাইসেন্স
            </span>
          ) : null}
          <span className="rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
            {exp > 0 ? `${toBn(exp)} বছরের অভিজ্ঞতা` : 'নতুন ড্রাইভারও চলবে'}
          </span>
          {b.residence ? (
            <span className="rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
              {lbl(RESIDENCE_LABEL, b.residence)}
            </span>
          ) : null}
          {b.startFrom ? (
            <span className="rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
              শুরু: {monthBn(String(b.startFrom))}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
