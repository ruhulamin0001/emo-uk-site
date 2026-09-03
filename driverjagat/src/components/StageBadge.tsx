import { JOB_CLOSED_LABEL, JOB_STAGE_LABEL, type JobStatus } from '@/types/enums';

const COLOR: Record<string, string> = {
  pending: 'bg-ink-100 text-ink-600',
  published: 'bg-success-bg text-success',
  shortlisted: 'bg-info-bg text-info',
  onboarding: 'bg-warning-bg text-warning',
  completed: 'bg-success-bg text-success',
  rejected: 'bg-danger-bg text-danger',
  needs_edit: 'bg-warning-bg text-warning',
  expired: 'bg-ink-100 text-ink-600',
  cancelled: 'bg-ink-100 text-ink-600',
  hired_outside: 'bg-ink-100 text-ink-600',
};

export function StageBadge({ stage }: { stage: JobStatus }) {
  const label =
    (JOB_STAGE_LABEL as Record<string, string>)[stage] ??
    (JOB_CLOSED_LABEL as Record<string, string>)[stage] ??
    stage;
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-sm font-medium ${COLOR[stage] ?? 'bg-ink-100 text-ink-600'}`}
    >
      {label}
    </span>
  );
}
