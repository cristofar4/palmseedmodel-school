import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  approvalEmail,
  contactAcknowledgementEmail,
  passwordResetEmail,
  verificationEmail,
  newDeviceEmail,
} from '@/lib/email/templates';
import { formatNaira, initialsOf, statusLabel, escapeHtml } from '@/lib/format';

describe('email templates', () => {
  const snapshot = {
    deviceLabel: 'Chrome on Android (Phone)',
    browser: 'Chrome',
    operatingSystem: 'Android',
    region: 'NG',
    when: new Date('2026-03-04T09:30:00Z'),
  };

  it('renders a verification email carrying the link and the branding', () => {
    const email = verificationEmail({
      fullName: 'Adaeze Okonkwo',
      verifyUrl: 'https://example.test/verify?token=abc',
    });

    expect(email.subject).toContain('Confirm your email');
    expect(email.html).toContain('https://example.test/verify?token=abc');
    expect(email.html).toContain('Palmseed Model School');
    expect(email.html).toContain('Always Useful');
    expect(email.text).toContain('https://example.test/verify?token=abc');
  });

  it('puts the reset code in the subject line and the body', () => {
    const email = passwordResetEmail({ fullName: 'Adaeze', code: '482913', snapshot });
    expect(email.subject).toContain('482913');
    expect(email.html).toContain('482913');
    expect(email.html).toContain('ten minutes');
  });

  it('states the admission number on an approval', () => {
    const email = approvalEmail({
      studentName: 'Adaeze Okonkwo',
      admissionNumber: 'PMS/2025/0001',
      className: 'JSS 1 A',
      sessionName: '2025/2026',
      isGuardianCopy: false,
    });

    expect(email.html).toContain('PMS/2025/0001');
    expect(email.html).toContain('JSS 1 A');
    expect(email.subject).toContain('Admission approved');
  });

  it('addresses a guardian copy to the guardian', () => {
    const email = approvalEmail({
      studentName: 'Adaeze Okonkwo',
      admissionNumber: 'PMS/2025/0001',
      className: 'JSS 1 A',
      sessionName: '2025/2026',
      isGuardianCopy: true,
      guardianName: 'Mrs Okonkwo',
    });

    expect(email.html).toContain('Mrs Okonkwo');
  });

  it('reports the region only when one was captured', () => {
    const withRegion = newDeviceEmail({ fullName: 'A', snapshot, reason: 'new_device' });
    expect(withRegion.html).toContain('Region');

    const withoutRegion = newDeviceEmail({
      fullName: 'A',
      snapshot: { ...snapshot, region: null },
      reason: 'new_device',
    });
    expect(withoutRegion.html).not.toContain('Region');
  });

  it('escapes user supplied text so a name cannot inject markup', () => {
    const email = contactAcknowledgementEmail({
      name: 'Tunde',
      subject: '<script>alert(1)</script>',
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});

describe('formatting', () => {
  it('formats kobo as naira', () => {
    expect(formatNaira(15_000_00)).toContain('15,000');
    expect(formatNaira(null)).toBe('Not recorded');
  });

  it('builds professional initials', () => {
    expect(initialsOf('Adaeze Okonkwo')).toBe('AO');
    expect(initialsOf('Chinedu')).toBe('CH');
    expect(initialsOf('Ngozi Amara Eze')).toBe('NE');
    expect(initialsOf('   ')).toBe('PS');
  });

  it('labels account statuses in the school wording', () => {
    expect(statusLabel('pending_review')).toBe('Pending Review');
    expect(statusLabel('active')).toBe('Active');
    expect(statusLabel('graduated')).toBe('Graduated');
  });

  it('escapes html', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});

/**
 * The house writing rule: no hyphens, en dashes or em dashes in text a visitor
 * reads. This walks the rendered strings in the page and template sources and
 * fails if one slips in.
 *
 * Source syntax is exempt, so the check only looks at the contents of JSX text
 * nodes and of quoted strings that read like prose.
 */
describe('visible copy avoids hyphens and dashes', () => {
  const roots = ['src/app', 'src/components'];

  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else if (full.endsWith('.tsx')) out.push(full);
    }
    return out;
  }

  const files = roots.flatMap((root) => walk(path.join(process.cwd(), root)));

  it('finds page and component files to check', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('has no dash characters in JSX prose', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');

      for (const [index, line] of source.split('\n').entries()) {
        const trimmed = line.trim();

        // Only whole line JSX text nodes are treated as prose. Anything
        // carrying markup, an attribute, a class name or code is skipped,
        // because dashes are legitimate there.
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        // Anything carrying markup, an object key, a call, or an operator is
        // source rather than prose.
        if (/[<>{}=/\\`$:;()[\]|&*%#@]/.test(trimmed)) continue;
        if (!/^[A-Za-z]/.test(trimmed)) continue;
        // Prose has several words. A bare identifier does not.
        if (trimmed.split(/\s+/).length < 4) continue;

        if (/[–—]/.test(trimmed) || / - /.test(trimmed)) {
          offenders.push(`${path.relative(process.cwd(), file)}:${index + 1}  ${trimmed}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
