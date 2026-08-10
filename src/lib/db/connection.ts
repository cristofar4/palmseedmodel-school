/**
 * Checks a database connection string before anything tries to connect with it.
 *
 * `pg` parses the string with `new URL`, and when that fails it throws the
 * two words "Invalid URL" and nothing else. No hint about which variable, no
 * hint about what is wrong with it, and no way to look without exposing the
 * password. Every one of the common mistakes here is recognisable, so they are
 * recognised and named.
 *
 * Nothing in this file ever puts the password in a message.
 */

/** Everything after the password is safe to show. The password is not. */
export function redact(connectionString: string): string {
  return connectionString.replace(/^([^:]+:\/\/[^:@]*:)[^@]*(@)/, '$1********$2');
}

const PLACEHOLDERS = [
  'YOUR-PASSWORD',
  'YOUR_PASSWORD',
  'NEWPASSWORD',
  'NEW-PASSWORD',
  'PASSWORD',
  'your-password',
  '<region>',
  'REGION',
  'MY_VERIFIED_DOMAIN',
  'user:password',
];

export function assertUsableConnectionString(value: string, variableName: string): void {
  const fail = (problem: string, fix: string): never => {
    throw new Error(
      `${variableName} is not a usable connection string.\n\n` +
        `  Problem: ${problem}\n` +
        `  Fix:     ${fix}\n\n` +
        `  It currently looks like:\n    ${redact(value)}\n`,
    );
  };

  const trimmed = value.trim();

  if (trimmed !== value) {
    fail(
      'it has whitespace or a line break around it',
      'copy the string again without the surrounding spaces or newline',
    );
  }

  if (!/^postgres(ql)?:\/\//.test(trimmed)) {
    fail(
      'it does not begin with postgresql://',
      'use the full URI from Supabase, not just the host name',
    );
  }

  if (/[[\]]/.test(trimmed)) {
    fail(
      'it still contains a square bracket',
      'Supabase writes [YOUR-PASSWORD] as a placeholder. Replace the brackets ' +
        'and everything between them with the password itself',
    );
  }

  const placeholder = PLACEHOLDERS.find((p) => trimmed.includes(p));
  if (placeholder) {
    fail(
      `it still contains the placeholder text "${placeholder}"`,
      'substitute the real value for that placeholder',
    );
  }

  /* Checked before new URL, because a bad port makes it throw the same
     "Invalid URL" as a bad password and the advice for the two is different. */
  const afterHost = trimmed.slice(trimmed.lastIndexOf('@') + 1);
  const port = /:([^/?]*)/.exec(afterHost)?.[1];
  if (port !== undefined && !/^\d+$/.test(port)) {
    fail(
      `"${port}" is not a port number`,
      'the port comes after the host name and is 5432 for the session pooler ' +
        'and the direct connection, or 6543 for the transaction pooler',
    );
  }

  try {
    const url = new URL(trimmed);

    if (!url.hostname) {
      fail('it has no host name', 'copy the whole URI from the Supabase dashboard');
    }
    if (!url.password) {
      fail(
        'it has no password',
        'the format is postgresql://user:password@host:5432/database',
      );
    }
    if (url.pathname === '' || url.pathname === '/') {
      fail('it names no database', 'the path after the port should be /postgres');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes(variableName)) throw error;

    /* new URL rejected it and the specific checks above did not catch why.
       By far the most common remaining cause is a password containing a
       character that has a meaning inside a URL. */
    fail(
      'it is not a valid URL, most often because the password contains one of ' +
        '@ : / ? # [ ] or a percent sign',
      'either reset the database password to one made only of letters and ' +
        'digits, which is the quicker fix, or percent encode those characters ' +
        '(@ becomes %40, # becomes %23, / becomes %2F, ? becomes %3F, ' +
        ': becomes %3A, % becomes %25)',
    );
  }
}
