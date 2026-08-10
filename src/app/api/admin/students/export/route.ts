import { requireApiAdmin } from '@/lib/auth/api-guards';
import { recordAudit } from '@/lib/auth/events';
import { students } from '@/lib/data/admin';
import { requestContext } from '@/lib/security/request-context';
import { formatDate, statusLabel } from '@/lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLUMNS = [
  'Admission number',
  'Full name',
  'Email',
  'Phone',
  'Status',
  'Class',
  'Date of birth',
  'Admitted on',
  'Previous school',
  'Guardian name',
  'Guardian email',
  'Guardian phone',
  'Email confirmed',
  'Account created',
  'Last sign in',
] as const;

/**
 * Escapes a value for CSV.
 *
 * Note the leading apostrophe on anything starting with a formula character.
 * Without it a spreadsheet would evaluate a crafted name as a formula when the
 * export is opened, which is a real risk for a file full of user supplied text.
 */
function csvCell(value: string | null | undefined): string {
  const raw = value ?? '';
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** Exports the student roll as CSV, honouring the current filters. */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { principal } = auth;

  const params = new URL(request.url).searchParams;

  const rows = await students(principal, {
    search: params.get('search') ?? undefined,
    status: params.get('status') ?? undefined,
    classId: params.get('classId') ?? undefined,
    limit: 5000,
  });

  const lines = [
    COLUMNS.map(csvCell).join(','),
    ...rows.map((row) =>
      [
        row.admission_number,
        row.full_name,
        row.email,
        row.phone,
        statusLabel(row.status),
        row.class_label,
        row.date_of_birth ? formatDate(row.date_of_birth) : '',
        row.admitted_on ? formatDate(row.admitted_on) : '',
        row.previous_school,
        row.guardian_name,
        row.guardian_email,
        row.guardian_phone,
        row.email_verified_at ? 'Yes' : 'No',
        formatDate(row.created_at),
        row.last_login_at ? formatDate(row.last_login_at) : 'Never',
      ]
        .map(csvCell)
        .join(','),
    ),
  ];

  const context = await requestContext();
  await recordAudit({
    principal,
    action: 'students.export',
    entityType: 'user',
    summary: `Exported ${rows.length} student record(s) to CSV`,
    ipHash: context.ipHash,
  });

  const stamp = new Date().toISOString().slice(0, 10);

  // The byte order mark makes Excel read the file as UTF-8 rather than as the
  // local code page, which matters for Nigerian names.
  return new Response(`﻿${lines.join('\r\n')}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="palmseed-students-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
