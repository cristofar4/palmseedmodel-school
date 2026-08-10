import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { requireApiAdmin } from '@/lib/auth/api-guards';
import { recordAudit } from '@/lib/auth/events';
import { withPrincipal } from '@/lib/db/pool';
import { requestContext } from '@/lib/security/request-context';
import { announcementSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { user: admin, principal } = auth;

  const parsed = parseBody(announcementSchema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  if (input.audience === 'class' && !input.classId) {
    return fail('Choose the class this announcement is for.', 422, {
      fields: { classId: 'Select a class.' },
    });
  }

  const created = await withPrincipal(principal, (tx) =>
    tx.one<{ id: string }>(
      `insert into announcements (title, body, audience, class_id, is_pinned, published_at, author_id)
       values ($1, $2, $3, nullif($4, '')::uuid, $5, case when $6 then now() else null end, $7)
       returning id`,
      [
        input.title,
        input.body,
        input.audience,
        input.audience === 'class' ? (input.classId ?? '') : '',
        input.isPinned,
        input.publish,
        admin.id,
      ],
    ),
  );

  const context = await requestContext();
  await recordAudit({
    principal,
    action: input.publish ? 'announcement.publish' : 'announcement.draft',
    entityType: 'announcement',
    entityId: created.id,
    summary: `${input.publish ? 'Published' : 'Saved a draft of'} "${input.title}"`,
    changes: { audience: input.audience },
    ipHash: context.ipHash,
  });

  return ok(
    {
      id: created.id,
      message: input.publish ? 'Announcement published.' : 'Draft saved.',
    },
    { status: 201 },
  );
}
