import { BRAND, SCHOOL, siteUrl } from '@/lib/school';
import { escapeHtml } from '@/lib/format';

/**
 * Branded email shell.
 *
 * Written as table based HTML with inline styles, because that is what still
 * renders predictably in Outlook, Gmail and the Android mail clients most
 * guardians will be reading on.
 */

export interface EmailBlock {
  html: string;
  text: string;
}

export interface EmailDocument {
  subject: string;
  html: string;
  text: string;
}

export function paragraph(content: string): EmailBlock {
  return {
    html: `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.ink};">${content}</p>`,
    text: `${stripTags(content)}\n\n`,
  };
}

export function heading(content: string): EmailBlock {
  return {
    html: `<h2 style="margin:0 0 14px;font-size:21px;line-height:1.3;font-weight:600;color:${BRAND.ink};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(content)}</h2>`,
    text: `${content}\n\n`,
  };
}

/** A large, spaced code block used for the six digit password reset code. */
export function codeBlock(code: string): EmailBlock {
  return {
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr><td align="center" style="padding:22px 16px;background:${BRAND.warm};border:1px solid ${BRAND.hairline};border-radius:4px;">
          <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.muted};margin-bottom:10px;font-family:Arial,Helvetica,sans-serif;">Your reset code</div>
          <div style="font-size:34px;letter-spacing:0.34em;font-weight:700;color:${BRAND.ink};font-family:'Courier New',Courier,monospace;">${escapeHtml(code)}</div>
        </td></tr>
      </table>`,
    text: `Your reset code: ${code}\n\n`,
  };
}

export function button(label: string, href: string): EmailBlock {
  return {
    html: `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 24px;">
        <tr><td style="background:${BRAND.red};border-radius:3px;">
          <a href="${escapeHtml(href)}"
             style="display:inline-block;padding:14px 30px;font-size:14px;font-weight:600;letter-spacing:0.02em;color:${BRAND.white};text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
            ${escapeHtml(label)}
          </a>
        </td></tr>
      </table>
      <p style="margin:0 0 20px;font-size:12px;line-height:1.6;color:${BRAND.muted};">
        If the button does not work, copy this address into your browser.<br>
        <span style="color:${BRAND.ink};word-break:break-all;">${escapeHtml(href)}</span>
      </p>`,
    text: `${label}: ${href}\n\n`,
  };
}

/** Two column detail table, used for security notices and approval letters. */
export function detailTable(rows: Array<[string, string]>): EmailBlock {
  const body = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:9px 14px 9px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted};border-bottom:1px solid ${BRAND.hairline};white-space:nowrap;vertical-align:top;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(label)}</td>
        <td style="padding:9px 0;font-size:14px;color:${BRAND.ink};border-bottom:1px solid ${BRAND.hairline};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join('');

  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;">${body}</table>`,
    text: `${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\n`,
  };
}

export function notice(content: string): EmailBlock {
  return {
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
        <tr><td style="padding:15px 18px;background:${BRAND.warm};border-left:3px solid ${BRAND.red};">
          <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.ink};font-family:Arial,Helvetica,sans-serif;">${content}</p>
        </td></tr>
      </table>`,
    text: `${stripTags(content)}\n\n`,
  };
}

function stripTags(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Wraps blocks in the school shell.
 *
 * The logo is referenced by absolute URL. Mail clients that block remote
 * images fall back to the alt text, which is why the school name is also
 * written out underneath it.
 */
export function renderEmail(options: {
  subject: string;
  preheader: string;
  blocks: EmailBlock[];
  footerNote?: string;
}): EmailDocument {
  const { subject, preheader, blocks, footerNote } = options;
  const base = siteUrl();

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.warm};-webkit-font-smoothing:antialiased;">
  <!-- Preview line shown in the inbox list, hidden in the open message. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.warm};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:600px;background:${BRAND.white};border:1px solid ${BRAND.hairline};">

          <!-- Masthead -->
          <tr>
            <td style="padding:26px 32px;border-bottom:1px solid ${BRAND.hairline};">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:13px;">
                    <img src="${base}/brand/palmseed-logo.png"
                         width="44" height="44" alt="${escapeHtml(SCHOOL.name)}"
                         style="display:block;width:44px;height:44px;border:0;object-fit:contain;">
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:600;color:${BRAND.ink};letter-spacing:-0.01em;">${escapeHtml(SCHOOL.name)}</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND.red};margin-top:3px;">${escapeHtml(SCHOOL.motto)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;">
              ${blocks.map((b) => b.html).join('\n')}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 32px 28px;border-top:1px solid ${BRAND.hairline};background:${BRAND.warm};">
              ${
                footerNote
                  ? `<p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;">${footerNote}</p>`
                  : ''
              }
              <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;">
                ${escapeHtml(SCHOOL.name)}, ${escapeHtml(SCHOOL.country)}.
                Reply to this message and it reaches the school office.
              </p>
              <p style="margin:0;font-size:11px;line-height:1.6;color:#8A8A93;font-family:Arial,Helvetica,sans-serif;">
                This message was sent by the Palmseed portal. If it reached you by mistake, please ignore it.
              </p>
            </td>
          </tr>
        </table>

        <p style="max-width:600px;margin:16px auto 0;font-size:11px;color:#8A8A93;text-align:center;font-family:Arial,Helvetica,sans-serif;">
          <a href="${base}" style="color:#8A8A93;text-decoration:underline;">${escapeHtml(base.replace(/^https?:\/\//, ''))}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    SCHOOL.name.toUpperCase(),
    SCHOOL.motto,
    '',
    ...blocks.map((b) => b.text),
    '',
    `${SCHOOL.name}, ${SCHOOL.country}.`,
    base,
  ].join('\n');

  return { subject, html, text: text.replace(/\n{3,}/g, '\n\n') };
}
