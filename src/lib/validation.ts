import { z } from 'zod';
import { CLASS_LEVELS, STREAMS } from '@/lib/school';

/**
 * Every request body is parsed through one of these before it reaches the
 * database. Messages are written for the person reading them on the form.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const emailSchema = trimmed(254)
  .min(3, 'Enter an email address.')
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

/**
 * Nigerian mobile numbers, written either locally as 08012345678 or
 * internationally as +2348012345678. Spaces and dashes are accepted on input
 * and stripped before storage.
 */
export const phoneSchema = trimmed(24)
  .min(7, 'Enter a phone number.')
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .refine(
    (value) => /^(\+?234|0)\d{10}$/.test(value) || /^\+\d{7,15}$/.test(value),
    'Enter a valid phone number, for example 08012345678.',
  );

export const fullNameSchema = trimmed(120)
  .min(2, 'Enter the full name.')
  .refine((value) => /^[\p{L}][\p{L}\s.'-]*$/u.test(value), 'Use letters, spaces and apostrophes only.');

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(200, 'Use fewer than 200 characters.');

export const classLevelSchema = z.enum(CLASS_LEVELS);
export const streamSchema = z.enum(STREAMS);

/* --- authentication ------------------------------------------------------ */

export const signupSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const signinSchema = z.object({
  // Either an email address or an admission number such as PMS/2025/0001.
  identifier: trimmed(254).min(3, 'Enter your email address or admission number.'),
  password: z.string().min(1, 'Enter your password.'),
});
export type SigninInput = z.infer<typeof signinSchema>;

export const requestResetSchema = z.object({ email: emailSchema });

export const verifyResetCodeSchema = z.object({
  email: emailSchema,
  code: trimmed(6).regex(/^\d{6}$/, 'Enter the six digit code.'),
});

export const completeResetSchema = z.object({
  email: emailSchema,
  code: trimmed(6).regex(/^\d{6}$/, 'Enter the six digit code.'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: passwordSchema,
});

/* --- admission application ----------------------------------------------- */

export const applicationSchema = z
  .object({
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the date of birth.')
      .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        if (Number.isNaN(date.getTime())) return false;
        const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return age >= 8 && age <= 25;
      }, 'The date of birth must be for a student between 8 and 25 years old.'),
    gender: z.enum(['Male', 'Female']).optional(),
    classApplyingFor: classLevelSchema,
    streamPreference: streamSchema.optional(),
    previousSchool: trimmed(160).optional().or(z.literal('')),
    homeAddress: trimmed(300).optional().or(z.literal('')),
    guardianName: fullNameSchema,
    guardianEmail: emailSchema,
    guardianPhone: phoneSchema,
    guardianRelationship: z.enum(['Mother', 'Father', 'Guardian']),
    guardianConsent: z.literal(true, { message: 'Guardian consent is required.' }),
    acceptTerms: z.literal(true, { message: 'The portal terms must be accepted.' }),
  })
  .refine(
    (value) => !value.classApplyingFor.startsWith('SS') || value.streamPreference !== undefined,
    { message: 'Choose Science, Art or Commercial for a senior class.', path: ['streamPreference'] },
  )
  .refine(
    (value) => value.classApplyingFor.startsWith('SS') || value.streamPreference === undefined,
    { message: 'A pathway is only chosen for senior classes.', path: ['streamPreference'] },
  );
export type ApplicationInput = z.infer<typeof applicationSchema>;

/* --- public contact form ------------------------------------------------- */

export const contactSchema = z.object({
  name: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  subject: trimmed(140).min(3, 'Enter a subject.'),
  message: trimmed(4000).min(20, 'Please write at least 20 characters so we can help properly.'),
  // Hidden field. Real people leave it empty, simple bots fill it in.
  website: z.string().max(0, 'This request looks automated.').optional(),
});

/* --- administrator actions ----------------------------------------------- */

export const reviewApplicationSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('approve'),
    applicationId: z.uuid(),
    classId: z.uuid('Choose a class.'),
    sessionId: z.uuid('Choose an academic session.'),
    note: trimmed(600).optional().or(z.literal('')),
  }),
  z.object({
    decision: z.literal('reject'),
    applicationId: z.uuid(),
    note: trimmed(600).min(5, 'Give a short reason so the family understands.'),
  }),
]);

export const createTeacherSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  staffNumber: trimmed(40).min(2, 'Enter a staff number.'),
  qualification: trimmed(120).optional().or(z.literal('')),
  specialism: trimmed(120).optional().or(z.literal('')),
});

export const assignTeacherSchema = z
  .object({
    teacherId: z.uuid('Choose a teacher.'),
    classId: z.uuid('Choose a class.'),
    sessionId: z.uuid('Choose an academic session.'),
    // Empty means a form teacher assignment, which covers the whole class
    // rather than one subject.
    subjectId: z.uuid().optional().or(z.literal('')),
    isFormTeacher: z.boolean().default(false),
  })
  .refine((value) => value.isFormTeacher || (value.subjectId ?? '') !== '', {
    message: 'Choose a subject, or mark this as the form teacher assignment.',
    path: ['subjectId'],
  });

export const removeAssignmentSchema = z.object({
  assignmentId: z.uuid(),
});

export const updateStatusSchema = z.object({
  userId: z.uuid(),
  status: z.enum(['pending_review', 'active', 'suspended', 'graduated', 'rejected']),
  reason: trimmed(400).optional().or(z.literal('')),
});

export const announcementSchema = z.object({
  title: trimmed(160).min(4, 'Enter a title.'),
  body: trimmed(8000).min(10, 'Write the announcement.'),
  audience: z.enum(['public', 'students', 'guardians', 'teachers', 'class']),
  classId: z.uuid().optional().or(z.literal('')),
  publish: z.boolean().default(true),
  isPinned: z.boolean().default(false),
});

export const composeEmailSchema = z.object({
  audience: z.enum([
    'student',
    'guardian',
    'class',
    'all_students',
    'all_guardians',
    'students_and_guardians',
  ]),
  targetUserId: z.uuid().optional().or(z.literal('')),
  classId: z.uuid().optional().or(z.literal('')),
  subject: trimmed(160).min(3, 'Enter a subject.'),
  body: trimmed(10000).min(10, 'Write the message.'),
});

export const attendanceEntrySchema = z.object({
  classId: z.uuid(),
  termId: z.uuid(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
  entries: z
    .array(
      z.object({
        studentProfileId: z.uuid(),
        status: z.enum(['present', 'absent', 'late', 'excused']),
        note: trimmed(200).optional().or(z.literal('')),
      }),
    )
    .min(1, 'There are no students to record.'),
});

export const resultEntrySchema = z.object({
  classId: z.uuid(),
  subjectId: z.uuid(),
  termId: z.uuid(),
  publish: z.boolean().default(false),
  entries: z
    .array(
      z.object({
        studentProfileId: z.uuid(),
        caScore: z.number().min(0).max(40).nullable(),
        examScore: z.number().min(0).max(60).nullable(),
        remark: trimmed(300).optional().or(z.literal('')),
      }),
    )
    .min(1, 'There are no students to record.'),
});

export const settingsSchema = z.object({
  loginNotificationMode: z.enum(['all', 'suspicious_only', 'off']),
});

/** Flattens a Zod error into a field keyed map the forms can render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
