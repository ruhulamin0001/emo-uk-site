'use client';

import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { submitJobAction, type FormState } from '@/app/actions/employer';
import {
  BENEFIT_LABEL,
  DUTY_HOURS_LABEL,
  EMPLOYER_TYPE_LABEL,
  JOB_TYPE_LABEL,
  LICENSE_TYPE_LABEL,
  RESIDENCE_LABEL,
  VEHICLE_TYPE_LABEL,
} from '@/types/enums';
import { areas, districts, divisions } from '@/data/locations';
import { JOB } from '@/config/business';
import { uploadDoc, fileSize } from '@/lib/upload';
import { toBn } from '@/lib/format';

const initial: FormState = { ok: false };

function Err({ errors, k }: { errors?: Record<string, string>; k: string }) {
  const msg = errors?.[k];
  return msg ? <p className="mt-1 text-sm text-danger">{msg}</p> : null;
}

function Select({
  name,
  label,
  options,
  required,
  errors,
  errorKey,
}: {
  name: string;
  label: string;
  options: Record<string, string>;
  required?: boolean;
  errors?: Record<string, string>;
  errorKey: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue=""
        className="w-full rounded-md border border-ink-200 bg-white px-3 py-2"
      >
        <option value="" disabled={required}>
          বাছুন
        </option>
        {Object.entries(options).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <Err errors={errors} k={errorKey} />
    </div>
  );
}

function Input({
  name,
  label,
  errors,
  errorKey,
  ...rest
}: {
  name: string;
  label: string;
  errors?: Record<string, string>;
  errorKey: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="w-full rounded-md border border-ink-200 px-3 py-2"
        {...rest}
      />
      <Err errors={errors} k={errorKey} />
    </div>
  );
}

interface UploadedPhoto {
  path: string;
  url: string;
  size: number;
}

export function JobForm({ uid }: { uid: string }) {
  const [state, action, pending] = useActionState(submitJobAction, initial);
  const [divisionId, setDivisionId] = useState<string>('');
  const [districtId, setDistrictId] = useState<string>('');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const districtOptions = useMemo(
    () => districts.filter((d) => !divisionId || d.divisionId === divisionId),
    [divisionId],
  );
  const areaOptions = useMemo(
    () => areas.filter((a) => a.districtId === districtId),
    [districtId],
  );

  /**
   * Chobi AGE Storage e othe (client compress soho), form e sudhu
   * PATH jay hidden input e. Server oi path abar jachai kore
   * (nijer folder? amader banano nam?) - actions/employer.ts.
   */
  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    if (!uid) {
      setPhotoError('ছবি দিতে আগে লগইন করুন');
      return;
    }
    if (photos.length + files.length > JOB.maxPhotos) {
      setPhotoError(`সর্বোচ্চ ${toBn(JOB.maxPhotos)}টি ছবি`);
      return;
    }

    setUploading(true);
    setPhotoError(null);
    for (const [i, file] of files.entries()) {
      const res = await uploadDoc(file, 'job_photos', uid, `photo-${photos.length + i + 1}`);
      if (res.ok) {
        setPhotos((prev) => [...prev, { path: res.path, url: res.url, size: file.size }]);
      } else {
        setPhotoError(res.message);
      }
    }
    setUploading(false);
  }

  if (state.ok) {
    return (
      <div className="rounded-lg bg-success-bg p-6 text-success">
        <h2 className="text-lg font-semibold">জমা হয়েছে</h2>
        <p className="mt-2">{state.message}</p>
        <p className="mt-2">
          আপনার ট্র্যাকিং কোড: <strong className="font-mono">{state.trackingCode}</strong>
          <br />
          কোডটি লিখে রাখুন। এটি আর আপনার মোবাইল নম্বর দিয়ে যেকোনো সময়
          অবস্থা দেখতে পারবেন।
        </p>
        <Link href="/dashboard" className="mt-4 inline-block font-semibold underline">
          আমার পোস্টগুলো দেখুন
        </Link>
      </div>
    );
  }

  const errors = state.errors;

  return (
    <form action={action} className="space-y-8">
      {/* ══ Prokashsho ongsho ══ */}
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink-950">কাজের তথ্য</h2>
        <p className="text-sm text-ink-400">এই অংশটুকুই সবাই দেখতে পাবে।</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Select name="vehicleType" label="কোন গাড়ি চালাতে হবে" options={VEHICLE_TYPE_LABEL} required errors={errors} errorKey="public.vehicleType" />
          <Select name="jobType" label="কাজের ধরন" options={JOB_TYPE_LABEL} required errors={errors} errorKey="public.jobType" />
          <Select name="employerType" label="কে ড্রাইভার খুঁজছেন" options={EMPLOYER_TYPE_LABEL} required errors={errors} errorKey="public.employerType" />
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="startFrom">
              কোন মাস থেকে ড্রাইভার লাগবে
            </label>
            <input
              id="startFrom"
              name="startFrom"
              type="month"
              required
              className="w-full rounded-md border border-ink-200 bg-white px-3 py-2"
            />
            <Err errors={errors} k="public.startFrom" />
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink-950">বেতন ও শর্ত</h2>
        <p className="text-sm text-ink-400">
          বাস্তব বেতন লিখুন। অবাস্তব বেতনের পোস্ট আমরা প্রকাশ করি না।
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input name="salary" label="মাসিক বেতন (টাকা)" required inputMode="numeric" placeholder="যেমন: ১৮০০০" errors={errors} errorKey="public.salary" />
          <label className="flex items-center gap-2 pt-7 text-sm">
            <input type="checkbox" name="salaryNegotiable" className="h-4 w-4" />
            বেতন আলোচনা সাপেক্ষে
          </label>
          <Select name="dutyHours" label="দৈনিক ডিউটি" options={DUTY_HOURS_LABEL} required errors={errors} errorKey="public.dutyHours" />
          <Select name="residence" label="থাকার ব্যবস্থা" options={RESIDENCE_LABEL} required errors={errors} errorKey="public.residence" />
          <Select name="licenseRequired" label="কোন লাইসেন্স লাগবে" options={LICENSE_TYPE_LABEL} required errors={errors} errorKey="public.licenseRequired" />
          <Input name="experienceYearsMin" label="কমপক্ষে কত বছরের অভিজ্ঞতা (নতুন হলে ০)" inputMode="numeric" placeholder="যেমন: ৩" errors={errors} errorKey="public.experienceYearsMin" />
        </div>
        <div className="mt-4">
          <span className="mb-1 block text-sm font-medium">বেতনের বাইরে যা দেবেন</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(BENEFIT_LABEL).map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="benefits" value={v} className="h-4 w-4" />
                {l}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink-950">এলাকা</h2>
        <p className="text-sm text-ink-400">
          ওয়েবসাইটে এলাকা পর্যন্তই দেখানো হয়। পূর্ণ ঠিকানা নিচের গোপন অংশে।
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="divisionId">
              বিভাগ
            </label>
            <select
              id="divisionId"
              name="divisionId"
              required
              defaultValue=""
              onChange={(e) => {
                setDivisionId(e.target.value);
                setDistrictId('');
              }}
              className="w-full rounded-md border border-ink-200 bg-white px-3 py-2"
            >
              <option value="" disabled>
                বাছুন
              </option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.bn}
                </option>
              ))}
            </select>
            <Err errors={errors} k="public.divisionId" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="districtId">
              জেলা
            </label>
            <select
              id="districtId"
              name="districtId"
              required
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              className="w-full rounded-md border border-ink-200 bg-white px-3 py-2"
            >
              <option value="" disabled>
                বাছুন
              </option>
              {districtOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.bn}
                </option>
              ))}
            </select>
            <Err errors={errors} k="public.districtId" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="areaId">
              এলাকা
            </label>
            <select
              id="areaId"
              name="areaId"
              required
              defaultValue=""
              className="w-full rounded-md border border-ink-200 bg-white px-3 py-2"
            >
              <option value="" disabled>
                বাছুন
              </option>
              {areaOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bn}
                </option>
              ))}
            </select>
            <Err errors={errors} k="public.areaId" />
          </div>
        </div>
      </section>

      {/* ══ Chobi - oichhik ══ */}
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink-950">গাড়ির ছবি (ঐচ্ছিক)</h2>
        <p className="text-sm text-ink-400">
          সর্বোচ্চ {toBn(JOB.maxPhotos)}টি। ছবিতে নম্বর প্লেট, ফোন নম্বর বা
          ঠিকানা যেন দেখা না যায়। ছবি দিলে ড্রাইভারদের আগ্রহ বেশি আসে।
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {photos.map((p) => (
            <div key={p.path} className="relative">
              <input type="hidden" name="photoPaths" value={p.path} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="গাড়ির ছবি" className="h-24 w-24 rounded-md object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((x) => x.path !== p.path))}
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-danger text-xs text-white"
                aria-label="ছবি বাদ দিন"
              >
                x
              </button>
              <p className="mt-0.5 text-center text-xs text-ink-400">{fileSize(p.size)}</p>
            </div>
          ))}

          {photos.length < JOB.maxPhotos ? (
            <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-ink-200 text-sm text-ink-400 hover:border-brand-700 hover:text-brand-700">
              {uploading ? '...' : '+ ছবি'}
              <input type="file" accept="image/*" multiple onChange={onPickPhotos} className="hidden" />
            </label>
          ) : null}
        </div>
        {photoError ? <p className="mt-2 text-sm text-danger">{photoError}</p> : null}
        <Err errors={errors} k="photoPaths" />
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink-950">আর কিছু বলার থাকলে</h2>
        <div className="mt-4">
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={500}
            placeholder="যেমন: সকালে স্কুল ড্রপ, অফিস আনা-নেওয়া, মাসে ২-৩টা লম্বা ট্রিপ, নন-স্মোকার হলে ভালো"
            className="w-full rounded-md border border-ink-200 px-3 py-2"
          />
          <Err errors={errors} k="public.description" />
        </div>
      </section>

      {/* ══ Gopon ongsho ══ */}
      <section className="rounded-lg border-2 border-brand-100 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ink-950">গোপন তথ্য</h2>
        <p className="text-sm text-ink-400">
          এই অংশ শুধু আমাদের টিম দেখবে। ওয়েবসাইটে কখনো প্রকাশ হবে না।
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input name="employerName" label="আপনার নাম (মালিক বা যোগাযোগের ব্যক্তি)" required errors={errors} errorKey="private.employerName" />
          <Input name="phone" label="যোগাযোগের মোবাইল নম্বর" required inputMode="tel" placeholder="01XXXXXXXXX" errors={errors} errorKey="private.phone" />
          <Input name="altPhone" label="বিকল্প নম্বর (ঐচ্ছিক)" inputMode="tel" errors={errors} errorKey="private.altPhone" />
          <Input name="email" label="ইমেইল (ঐচ্ছিক)" type="email" errors={errors} errorKey="private.email" />
          <Input name="vehicleRegNo" label="গাড়ির রেজিস্ট্রেশন নম্বর (ঐচ্ছিক)" placeholder="যেমন: ঢাকা মেট্রো গ ১২-৩৪৫৬" errors={errors} errorKey="private.vehicleRegNo" />
          <Input name="landmark" label="কাছের পরিচিত জায়গা (ঐচ্ছিক)" placeholder="যেমন: মিরপুর ১০ গোলচত্বরের পাশে" errors={errors} errorKey="private.landmark" />
          <div className="sm:col-span-2">
            <Input name="fullAddress" label="পূর্ণ ঠিকানা (গাড়ি যেখানে থাকে / ডিউটির জায়গা)" required errors={errors} errorKey="private.fullAddress" />
          </div>
        </div>
      </section>

      {state.message && !state.ok ? <p className="text-danger">{state.message}</p> : null}

      <button
        disabled={pending || uploading}
        className="w-full rounded-lg bg-brand-700 py-3 text-lg font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? 'জমা হচ্ছে...' : 'ড্রাইভার চাই পোস্ট জমা দিন'}
      </button>
    </form>
  );
}
