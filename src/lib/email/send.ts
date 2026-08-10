import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Resend } from 'resend';
import { AUTHENTICATOR, withPrincipal, type Principal } from '@/lib/db/pool';
import { emailIsLive } from '@/lib/env';
import type { EmailDocument } from './layout';

export type EmailStatus = 'queued' | 'sent' | 'failed' | 'simulated';

export interface SendOptions {
  to: string;
  toName?: string | null;
  document: EmailDocument;
  /** Template identifier, recorded so the delivery history is filterable. */
  template: string;
  relatedUserId?: string | null;
  createdBy?: string | null;
  campaignId?: string | null;
  metadata?: Record<string, unknown>;
  /** Principal used to write the ledger row. Defaults to the authenticator. */
  principal?: Principal;
}

export interface SendResult {
  logId: string;
  status: EmailStatus;
  providerId: string | null;
  error: string | null;
}

let resendClient: Resend | null = null;

function resend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? 'Palmseed Model School <noreply@example.invalid>';
}

function replyToAddress(): string {
  return process.env.EMAIL_REPLY_TO ?? 'christopherpraise864@gmail.com';
}

export function adminNotificationAddress(): string {
  return process.env.ADMIN_NOTIFICATION_EMAIL ?? 'christopherpraise864@gmail.com';
}

/**
 * Writes the rendered message to .mail-outbox so it can be opened and checked
 * when no Resend key is configured. Failure here is not important, the ledger
 * row is the record that matters.
 */
async function writeToOutbox(options: SendOptions): Promise<void> {
  try {
    const dir = path.join(process.cwd(), '.mail-outbox');
    await mkdir(dir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTo = options.to.replace(/[^a-zA-Z0-9@._-]/g, '_');
    const file = path.join(dir, `${stamp}__${options.template}__${safeTo}.html`);

    await writeFile(file, options.document.html, 'utf8');
  } catch {
    // A read only filesystem is expected in production. Nothing to do.
  }
}

/**
 * Sends one message and records it in the delivery ledger.
 *
 * The ledger row is always written first, so a message can never be sent
 * without a trace. When RESEND_API_KEY is absent the message is rendered,
 * recorded as simulated and written to the local outbox, which keeps every
 * calling path exercisable without a provider account.
 *
 * A delivery failure is reported in the return value rather than thrown. No
 * signup or password reset should fail because a mail server is unhappy.
 */
export async function sendEmail(options: SendOptions): Promise<SendResult> {
  const principal = options.principal ?? AUTHENTICATOR;

  // The identifier is generated here, and both ledger writes go through the
  // security definer helpers from migration 0007.
  //
  // The ledger is readable by administrators only, and the authenticator that
  // sends verification and reset mail must not be given read access to it.
  // Since PostgreSQL applies SELECT policies to any statement referencing a
  // column, a plain `returning id` or `where id = $1` would be filtered away.
  // The helpers append and settle without ever reading anything back.
  const logId = randomUUID();

  await withPrincipal(principal, (tx) =>
    tx.exec('select palmseed_log_email($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)', [
      logId,
      options.to.toLowerCase(),
      options.toName ?? null,
      replyToAddress(),
      options.document.subject,
      options.template,
      options.relatedUserId ?? null,
      options.createdBy ?? null,
      options.campaignId ?? null,
      JSON.stringify(options.metadata ?? {}),
    ]),
  );

  const settle = async (
    status: EmailStatus,
    providerId: string | null,
    error: string | null,
  ): Promise<SendResult> => {
    await withPrincipal(principal, (tx) =>
      tx.exec('select palmseed_settle_email($1,$2,$3,$4)', [logId, status, providerId, error]),
    );
    return { logId, status, providerId, error };
  };

  if (!emailIsLive()) {
    await writeToOutbox(options);
    return settle('simulated', null, null);
  }

  try {
    const response = await resend().emails.send({
      from: fromAddress(),
      to: [options.to],
      replyTo: replyToAddress(),
      subject: options.document.subject,
      html: options.document.html,
      text: options.document.text,
    });

    if (response.error) {
      return settle('failed', null, response.error.message ?? 'Provider rejected the message');
    }

    return settle('sent', response.data?.id ?? null, null);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown transport failure';
    return settle('failed', null, message.slice(0, 500));
  }
}

/** Sends the same document to many addresses, one ledger row each. */
export async function sendBulk(
  recipients: Array<{ to: string; toName?: string | null; relatedUserId?: string | null }>,
  build: (recipient: { to: string; toName?: string | null }) => EmailDocument,
  shared: Omit<SendOptions, 'to' | 'toName' | 'document' | 'relatedUserId'>,
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  // Sent in sequence. Volumes here are a class or a school roll, and this
  // keeps the request well inside provider rate limits.
  for (const recipient of recipients) {
    results.push(
      await sendEmail({
        ...shared,
        to: recipient.to,
        toName: recipient.toName ?? null,
        relatedUserId: recipient.relatedUserId ?? null,
        document: build(recipient),
      }),
    );
  }

  return results;
}
