import 'server-only';
import { headers } from 'next/headers';
import { hashIp } from './tokens';

export type DeviceType = 'Phone' | 'Tablet' | 'Computer' | 'Unknown';

export interface RequestContext {
  ipHash: string | null;
  /** Coarse origin label supplied by the edge network, never geolocated here. */
  region: string | null;
  userAgent: string;
  deviceType: DeviceType;
  browser: string;
  operatingSystem: string;
  /** Human readable summary used in security emails and the activity feed. */
  deviceLabel: string;
}

/**
 * Derives the client address from the proxy headers the hosting platform sets.
 * The left most entry of x-forwarded-for is the original client.
 */
function clientIp(h: Headers): string | null {
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return h.get('x-real-ip') ?? h.get('cf-connecting-ip') ?? null;
}

/**
 * A small user agent parser. A dependency is not worth carrying for the four
 * facts the security log needs, and this stays predictable.
 */
export function parseUserAgent(ua: string): {
  deviceType: DeviceType;
  browser: string;
  operatingSystem: string;
} {
  if (!ua) {
    return { deviceType: 'Unknown', browser: 'Unknown', operatingSystem: 'Unknown' };
  }

  const isTablet = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua);
  const isPhone = /Mobile|iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile/i.test(ua);
  const deviceType: DeviceType = isTablet ? 'Tablet' : isPhone ? 'Phone' : 'Computer';

  // Order matters. Several browsers include the Chrome and Safari tokens.
  let browser = 'Unknown';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  let operatingSystem = 'Unknown';
  if (/Windows NT 10|Windows NT 11/i.test(ua)) operatingSystem = 'Windows';
  else if (/Windows/i.test(ua)) operatingSystem = 'Windows';
  else if (/Android/i.test(ua)) operatingSystem = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) operatingSystem = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(ua)) operatingSystem = 'macOS';
  else if (/Linux/i.test(ua)) operatingSystem = 'Linux';

  return { deviceType, browser, operatingSystem };
}

export function describeDevice(browser: string, operatingSystem: string, device: DeviceType): string {
  const parts = [browser, operatingSystem].filter((p) => p !== 'Unknown');
  if (parts.length === 0) return device === 'Unknown' ? 'Unrecognised device' : device;
  return `${parts.join(' on ')} (${device})`;
}

export async function requestContext(): Promise<RequestContext> {
  const h = await headers();
  const userAgent = h.get('user-agent') ?? '';
  const { deviceType, browser, operatingSystem } = parseUserAgent(userAgent);

  // Supplied by the hosting edge. Absent in local development, and that is
  // recorded honestly as null rather than guessed.
  const region =
    h.get('x-vercel-ip-country') ??
    h.get('cf-ipcountry') ??
    h.get('x-country-code') ??
    null;

  return {
    ipHash: hashIp(clientIp(h)),
    region,
    userAgent: userAgent.slice(0, 500),
    deviceType,
    browser,
    operatingSystem,
    deviceLabel: describeDevice(browser, operatingSystem, deviceType),
  };
}

/**
 * Rejects cross site form posts. Next protects server actions automatically,
 * these are the route handlers, which need the check made explicitly.
 */
export async function sameOriginRequest(): Promise<boolean> {
  const h = await headers();
  const origin = h.get('origin');

  // Same origin navigations from some browsers omit Origin entirely.
  if (!origin) return true;

  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
