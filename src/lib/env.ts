import 'server-only';
import { z } from 'zod';

/**
 * Server side configuration. Parsed once, lazily, so that a missing optional
 * integration degrades in a defined way instead of crashing the whole render.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .default('development-only-secret-value-change-me-now'),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Palmseed Model School <noreply@example.invalid>'),
  EMAIL_REPLY_TO: z.string().email().default('christopherpraise864@gmail.com'),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().default('christopherpraise864@gmail.com'),

  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type AppEnv = z.infer<typeof schema>;

let cached: AppEnv | null = null;

export function env(): AppEnv {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n  ');
    throw new Error(`Invalid environment configuration:\n  ${issues}`);
  }

  cached = parsed.data;
  return cached;
}

/** True when a real Resend key is present and mail should actually be sent. */
export function emailIsLive(): boolean {
  const key = process.env.RESEND_API_KEY;
  return typeof key === 'string' && key.trim().length > 0;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
