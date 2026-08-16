import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Verify session token using HMAC-SHA256 signature.
 * Edge Middleware cannot use Node.js crypto, so we implement
 * HMAC verification using the Web Crypto API (SubtleCrypto).
 */
async function isSessionValid(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return false;

    const encodedPayload = token.substring(0, dotIdx);
    const sig = token.substring(dotIdx + 1);
    const payload = atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'));

    // Get secret — use env var, fallback if not configured
    const secret = process.env.SESSION_SECRET || 'nexus_hmac_fallback_secret_change_this_in_env';
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSig = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (sig !== expectedSig) return false;

    // Check token expiry (30 days)
    const [timestampStr] = payload.split('.');
    const timestamp = Number(timestampStr);
    if (isNaN(timestamp)) return false;

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp < thirtyDaysMs;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('nexus_session')?.value;

  // Allow all API routes, static files, and Next.js internals without auth
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    // Protect sensitive API routes that modify state — require CRON_SECRET header
    const cronProtected = ['/api/ingestion/trigger', '/api/settings', '/api/subscribers'];
    const isCronRoute = cronProtected.some(p => pathname.startsWith(p));
    if (isCronRoute) {
      const cronSecret = process.env.CRON_SECRET;
      const authHeader = request.headers.get('authorization');
      const incomingSecret = authHeader?.replace('Bearer ', '');
      // Allow: valid session cookie OR correct CRON_SECRET (for Vercel cron)
      const hasValidSession = await isSessionValid(sessionCookie);
      const hasValidCronSecret = cronSecret && incomingSecret === cronSecret;
      if (!hasValidSession && !hasValidCronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  // Redirect authenticated users away from /login
  if (pathname === '/login') {
    const isAuthenticated = await isSessionValid(sessionCookie);
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protect all UI routes
  const isAuthenticated = await isSessionValid(sessionCookie);
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
