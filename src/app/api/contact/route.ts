import { guardMutation, ok, parseBody, rateLimited, readJson } from '@/lib/api';
import { adminNotificationAddress, sendEmail } from '@/lib/email/send';
import { contactAcknowledgementEmail, contactNotificationEmail } from '@/lib/email/templates';
import { RATE_LIMITS, consumeRateLimit } from '@/lib/security/rate-limit';
import { requestContext } from '@/lib/security/request-context';
import { contactSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public enquiry form. Notifies the school office and thanks the sender. */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const parsed = parseBody(contactSchema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  const context = await requestContext();

  const limit = await consumeRateLimit(RATE_LIMITS.contact, context.ipHash ?? input.email);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  const when = new Date();

  await sendEmail({
    to: adminNotificationAddress(),
    toName: 'Palmseed Administrator',
    template: 'contact_notification',
    metadata: { senderEmail: input.email, region: context.region },
    document: contactNotificationEmail({
      name: input.name,
      email: input.email,
      phone: input.phone && input.phone.length > 0 ? input.phone : null,
      subject: input.subject,
      message: input.message,
      when,
    }),
  });

  await sendEmail({
    to: input.email,
    toName: input.name,
    template: 'contact_acknowledgement',
    document: contactAcknowledgementEmail({ name: input.name, subject: input.subject }),
  });

  return ok({
    message: 'Thank you. Your message has reached the school office and we will reply soon.',
  });
}
