import { escapeHtml, formatDateTime, statusLabel } from '@/lib/format';
import { SCHOOL, siteUrl } from '@/lib/school';
import {
  button,
  codeBlock,
  detailTable,
  heading,
  notice,
  paragraph,
  renderEmail,
  type EmailDocument,
} from './layout';

/**
 * Every message the platform sends.
 *
 * Visible copy in these templates avoids hyphens and dashes, matching the
 * house writing rule used across the website.
 */

export interface SecuritySnapshot {
  deviceLabel: string;
  browser: string;
  operatingSystem: string;
  region: string | null;
  when: Date;
}

function securityRows(snapshot: SecuritySnapshot): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ['When', formatDateTime(snapshot.when)],
    ['Device', snapshot.deviceLabel],
    ['Browser', snapshot.browser],
    ['System', snapshot.operatingSystem],
  ];
  // Only shown when the hosting edge actually reported a region.
  if (snapshot.region) rows.push(['Region', snapshot.region]);
  return rows;
}

/* 1. Email verification ---------------------------------------------------- */
export function verificationEmail(input: {
  fullName: string;
  verifyUrl: string;
}): EmailDocument {
  return renderEmail({
    subject: 'Confirm your email address for Palmseed Model School',
    preheader: 'One step to finish setting up your Palmseed portal account.',
    blocks: [
      heading(`Welcome, ${input.fullName}.`),
      paragraph(
        'Please confirm this email address so we know we can reach you about your registration.',
      ),
      button('Confirm my email address', input.verifyUrl),
      paragraph('This link stays valid for 24 hours.'),
      notice(
        'If you did not create a Palmseed portal account, you can ignore this message and nothing will happen.',
      ),
    ],
  });
}

/* 2. Welcome after account creation --------------------------------------- */
export function welcomeEmail(input: {
  fullName: string;
  classApplyingFor: string;
}): EmailDocument {
  return renderEmail({
    subject: 'Your Palmseed registration has been received',
    preheader: 'We have your registration and the school is reviewing it now.',
    blocks: [
      heading(`Thank you, ${input.fullName}.`),
      paragraph(
        `Your registration for ${escapeHtml(input.classApplyingFor)} has reached the school office. Your account is open now with the status Pending Review.`,
      ),
      paragraph(
        'You can sign in straight away to check what you submitted and read school announcements. Your full student record opens once the school completes the review.',
      ),
      button('Open my portal', `${siteUrl()}/dashboard`),
      paragraph(
        'We will email you as soon as a decision is made. There is nothing else you need to do right now.',
      ),
    ],
  });
}

/* 3. Administrator notice of a new account -------------------------------- */
export function adminNewAccountEmail(input: {
  fullName: string;
  email: string;
  phone: string | null;
  classApplyingFor: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  applicationId: string;
  when: Date;
}): EmailDocument {
  const rows: Array<[string, string]> = [
    ['Applicant', input.fullName],
    ['Email', input.email],
  ];
  if (input.phone) rows.push(['Phone', input.phone]);
  rows.push(
    ['Class applied for', input.classApplyingFor],
    ['Guardian', input.guardianName],
    ['Guardian email', input.guardianEmail],
    ['Guardian phone', input.guardianPhone],
    ['Submitted', formatDateTime(input.when)],
  );

  return renderEmail({
    subject: `New registration: ${input.fullName} for ${input.classApplyingFor}`,
    preheader: `${input.fullName} has registered and is waiting for review.`,
    blocks: [
      heading('A new registration is waiting for review.'),
      detailTable(rows),
      button('Review this registration', `${siteUrl()}/admin/applications/${input.applicationId}`),
    ],
  });
}

/* 4a. Approval ------------------------------------------------------------- */
export function approvalEmail(input: {
  studentName: string;
  admissionNumber: string;
  className: string;
  sessionName: string;
  isGuardianCopy: boolean;
  guardianName?: string;
}): EmailDocument {
  const greeting = input.isGuardianCopy
    ? `Dear ${input.guardianName ?? 'Guardian'},`
    : `Congratulations, ${input.studentName}.`;

  const opening = input.isGuardianCopy
    ? `We are pleased to tell you that ${escapeHtml(input.studentName)} has been offered a place at ${SCHOOL.name}.`
    : 'You have been offered a place at Palmseed Model School.';

  return renderEmail({
    subject: `Admission approved: ${input.studentName}, ${input.className}`,
    preheader: `Admission number ${input.admissionNumber} has been issued.`,
    blocks: [
      heading(greeting),
      paragraph(opening),
      detailTable([
        ['Student', input.studentName],
        ['Admission number', input.admissionNumber],
        ['Class', input.className],
        ['Session', input.sessionName],
        ['Status', 'Active'],
      ]),
      paragraph(
        'The full portal is now open. Sign in to see subjects, timetable, assignments, results and fee information as the school publishes them.',
      ),
      button('Sign in to the portal', `${siteUrl()}/signin`),
      notice(
        `Please keep the admission number safe. It can be used in place of an email address when signing in.`,
      ),
    ],
  });
}

/* 4b. Rejection ------------------------------------------------------------ */
export function rejectionEmail(input: {
  studentName: string;
  reason: string | null;
  isGuardianCopy: boolean;
  guardianName?: string;
}): EmailDocument {
  return renderEmail({
    subject: 'Update on your Palmseed Model School registration',
    preheader: 'A decision has been made on this registration.',
    blocks: [
      heading(
        input.isGuardianCopy ? `Dear ${input.guardianName ?? 'Guardian'},` : `Dear ${input.studentName},`,
      ),
      paragraph(
        input.isGuardianCopy
          ? `Thank you for your interest in ${SCHOOL.name}. After review, we are not able to offer ${escapeHtml(input.studentName)} a place at this time.`
          : `Thank you for your interest in ${SCHOOL.name}. After review, we are not able to offer you a place at this time.`,
      ),
      ...(input.reason ? [notice(escapeHtml(input.reason))] : []),
      paragraph(
        'You are welcome to contact the school office if you would like to discuss this decision or apply again in a future session.',
      ),
      paragraph(`You can reply directly to this message and it will reach the school office.`),
    ],
  });
}

/* 5. Activation for an existing enrolled student --------------------------- */
export function activationEmail(input: {
  studentName: string;
  admissionNumber: string;
  className: string;
  activationUrl: string;
}): EmailDocument {
  return renderEmail({
    subject: 'Your Palmseed portal account is ready',
    preheader: 'Set your password to open your student portal.',
    blocks: [
      heading(`Hello ${input.studentName},`),
      paragraph(
        'The school has created a portal account for you. Set a password to open it.',
      ),
      detailTable([
        ['Admission number', input.admissionNumber],
        ['Class', input.className],
      ]),
      button('Set my password', input.activationUrl),
      paragraph('This link stays valid for 7 days. Ask the school office for a new one if it expires.'),
    ],
  });
}

/* 6. Student security notice for a new device ------------------------------ */
export function newDeviceEmail(input: {
  fullName: string;
  snapshot: SecuritySnapshot;
  reason: 'new_device' | 'long_absence';
}): EmailDocument {
  const lead =
    input.reason === 'new_device'
      ? 'Your Palmseed portal account was opened on a device we have not seen before.'
      : 'Your Palmseed portal account was opened after a long period without activity.';

  return renderEmail({
    subject: 'New sign in to your Palmseed account',
    preheader: lead,
    blocks: [
      heading(`Hello ${input.fullName},`),
      paragraph(lead),
      detailTable(securityRows(input.snapshot)),
      notice(
        'If this was you, no action is needed. If it was not you, change your password now and tell the school office.',
      ),
      button('Change my password', `${siteUrl()}/dashboard/security`),
    ],
  });
}

/* 7. Administrator notice of a student sign in ----------------------------- */
export function adminLoginNoticeEmail(input: {
  studentName: string;
  email: string;
  admissionNumber: string | null;
  accountStatus: string;
  snapshot: SecuritySnapshot;
  suspicious: boolean;
}): EmailDocument {
  const rows: Array<[string, string]> = [
    ['Account', input.studentName],
    ['Email', input.email],
  ];
  if (input.admissionNumber) rows.push(['Admission number', input.admissionNumber]);
  rows.push(['Status', statusLabel(input.accountStatus)], ...securityRows(input.snapshot));

  return renderEmail({
    subject: input.suspicious
      ? `Unusual sign in: ${input.studentName}`
      : `Portal sign in: ${input.studentName}`,
    preheader: `${input.studentName} signed in to the Palmseed portal.`,
    blocks: [
      heading(input.suspicious ? 'An unusual sign in was recorded.' : 'A portal sign in was recorded.'),
      detailTable(rows),
      button('Open the activity log', `${siteUrl()}/admin/security`),
    ],
    footerNote:
      'You are receiving this because sign in notifications are switched on. You can change this in the administrator dashboard under Settings.',
  });
}

/* 8. Six digit password reset code ----------------------------------------- */
export function passwordResetEmail(input: {
  fullName: string;
  code: string;
  snapshot: SecuritySnapshot;
}): EmailDocument {
  return renderEmail({
    subject: `${input.code} is your Palmseed password reset code`,
    preheader: 'This code expires in ten minutes.',
    blocks: [
      heading(`Hello ${input.fullName},`),
      paragraph('Use this code to set a new password. It expires in ten minutes and can be used once.'),
      codeBlock(input.code),
      detailTable(securityRows(input.snapshot)),
      notice(
        'If you did not ask for this, you can ignore this message. Your password stays as it is. Requesting a new code cancels this one.',
      ),
    ],
  });
}

/* 9. Password changed warning ---------------------------------------------- */
export function passwordChangedEmail(input: {
  fullName: string;
  snapshot: SecuritySnapshot;
  revokedSessions: number;
}): EmailDocument {
  return renderEmail({
    subject: 'Your Palmseed password was changed',
    preheader: 'A password change was completed on your account.',
    blocks: [
      heading(`Hello ${input.fullName},`),
      paragraph('The password on your Palmseed portal account has just been changed.'),
      detailTable(securityRows(input.snapshot)),
      paragraph(
        input.revokedSessions > 0
          ? `For your safety, every other signed in device has been signed out. That affected ${input.revokedSessions} session${input.revokedSessions === 1 ? '' : 's'}.`
          : 'For your safety, every other signed in device has been signed out.',
      ),
      notice(
        'If you did not do this, contact the school office immediately and reset your password again.',
      ),
    ],
  });
}

/* 10. Guardian announcement ------------------------------------------------ */
export function announcementEmail(input: {
  recipientName: string;
  title: string;
  body: string;
  studentName?: string;
}): EmailDocument {
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((chunk) => paragraph(escapeHtml(chunk).replace(/\n/g, '<br>')));

  return renderEmail({
    subject: input.title,
    preheader: input.body.slice(0, 120),
    blocks: [
      heading(input.title),
      ...(input.studentName
        ? [paragraph(`This notice concerns ${escapeHtml(input.studentName)}.`)]
        : []),
      ...paragraphs,
      button('Open the portal', `${siteUrl()}/dashboard`),
    ],
  });
}

/* 11. Contact form notice to the administrator ----------------------------- */
export function contactNotificationEmail(input: {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  when: Date;
}): EmailDocument {
  const rows: Array<[string, string]> = [
    ['From', input.name],
    ['Email', input.email],
  ];
  if (input.phone) rows.push(['Phone', input.phone]);
  rows.push(['Subject', input.subject], ['Received', formatDateTime(input.when)]);

  return renderEmail({
    subject: `Website enquiry: ${input.subject}`,
    preheader: `${input.name} sent a message through the website.`,
    blocks: [
      heading('A new enquiry came through the website.'),
      detailTable(rows),
      paragraph(escapeHtml(input.message).replace(/\n/g, '<br>')),
      notice(`Reply to this message and it goes straight back to ${escapeHtml(input.email)}.`),
    ],
  });
}

/* 12. Contact form acknowledgement ----------------------------------------- */
export function contactAcknowledgementEmail(input: {
  name: string;
  subject: string;
}): EmailDocument {
  return renderEmail({
    subject: 'We have received your message',
    preheader: 'Thank you for contacting Palmseed Model School.',
    blocks: [
      heading(`Thank you, ${input.name}.`),
      paragraph(
        `We have received your message about ${escapeHtml(input.subject)} and a member of staff will reply as soon as possible.`,
      ),
      paragraph('You do not need to send it again. If your enquiry is urgent, you can reply to this message.'),
    ],
  });
}

/* 13. Message composed in the administrator dashboard ---------------------- */
export function composedEmail(input: {
  recipientName: string | null;
  subject: string;
  body: string;
}): EmailDocument {
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((chunk) => paragraph(escapeHtml(chunk).replace(/\n/g, '<br>')));

  return renderEmail({
    subject: input.subject,
    preheader: input.body.slice(0, 120),
    blocks: [
      ...(input.recipientName ? [heading(`Dear ${input.recipientName},`)] : []),
      ...paragraphs,
    ],
    footerNote: 'This message was sent by the school office through the Palmseed portal.',
  });
}
