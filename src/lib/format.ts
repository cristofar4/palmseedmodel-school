/**
 * Formatting helpers. The school operates in Lagos, so every date the reader
 * sees is rendered in Africa/Lagos regardless of where the server runs.
 */
export const SCHOOL_TIMEZONE = 'Africa/Lagos';

const dateTimeFormatter = new Intl.DateTimeFormat('en-NG', {
  timeZone: SCHOOL_TIMEZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('en-NG', {
  timeZone: SCHOOL_TIMEZONE,
  dateStyle: 'medium',
});

const longDateFormatter = new Intl.DateTimeFormat('en-NG', {
  timeZone: SCHOOL_TIMEZONE,
  dateStyle: 'full',
});

const timeFormatter = new Intl.DateTimeFormat('en-NG', {
  timeZone: SCHOOL_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return 'Not recorded';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return `${dateTimeFormatter.format(date)} Lagos time`;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return 'Not recorded';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return dateFormatter.format(date);
}

export function formatLongDate(value: Date | string | null | undefined): string {
  if (!value) return 'Not recorded';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return longDateFormatter.format(date);
}

/** Accepts either a Date or a Postgres time value such as "08:30:00". */
export function formatTime(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') {
    const parts = value.split(':');
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return value;
  }
  return timeFormatter.format(value);
}

/** Money is stored in kobo. Naira is the unit the reader expects. */
export function formatNaira(kobo: number | string | null | undefined): string {
  if (kobo === null || kobo === undefined) return 'Not recorded';
  const value = typeof kobo === 'string' ? Number(kobo) : kobo;
  if (!Number.isFinite(value)) return 'Not recorded';

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * Professional initials used where no profile photograph has been uploaded.
 * Two letters at most, always upper case.
 */
export function initialsOf(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);

  if (parts.length === 0) return 'PS';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();

  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

/** Escapes text before it is interpolated into an HTML email body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function titleCase(value: string): string {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Turns an account status into the wording used across the interface. */
export function statusLabel(status: string): string {
  switch (status) {
    case 'pending_review':
      return 'Pending Review';
    case 'active':
      return 'Active';
    case 'suspended':
      return 'Suspended';
    case 'graduated':
      return 'Graduated';
    case 'rejected':
      return 'Rejected';
    default:
      return titleCase(status);
  }
}
